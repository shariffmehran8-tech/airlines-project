import sqlite3
import re
from datetime import datetime

from flask import Flask, render_template, request, jsonify, g

from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# ---------------------------------------------------------------------------
# Static content: fleet + destinations (in a real system this would live in
# the database too, but is kept here as clean seed data for the demo).
# ---------------------------------------------------------------------------

FLEET = [
    {
        "id": "light-jet",
        "name": "Aurelia Light",
        "category": "Light Jet",
        "passengers": "6–7",
        "range_km": 3000,
        "speed_kmh": 780,
        "cabin": "1.45m x 1.42m x 5.5m",
        "baggage": "1.2 m³",
        "blurb": "Agile, efficient, and ideal for short-to-mid range journeys without compromising on comfort.",
        "image": "jet-light.jpg",
    },
    {
        "id": "midsize-jet",
        "name": "Aurelia Meridian",
        "category": "Midsize Jet",
        "passengers": "7–9",
        "range_km": 5000,
        "speed_kmh": 830,
        "cabin": "1.75m x 1.70m x 7.3m",
        "baggage": "2.1 m³",
        "blurb": "A spacious cabin engineered for longer journeys, full connectivity, and quiet, focused travel.",
        "image": "jet-midsize.jpg",
    },
    {
        "id": "heavy-jet",
        "name": "Aurelia Sovereign",
        "category": "Heavy Jet",
        "passengers": "10–14",
        "range_km": 8200,
        "speed_kmh": 900,
        "cabin": "1.88m x 2.20m x 12.1m",
        "baggage": "4.8 m³",
        "blurb": "Our flagship aircraft — private suites, dedicated dining, and intercontinental range.",
        "image": "jet-heavy.jpg",
    },
]

DESTINATIONS = [
    {"id": "dubai", "name": "Dubai", "country": "United Arab Emirates", "x": 63.5, "y": 44.0, "image": "dest-dubai.jpg", "blurb": "Where desert modernity meets the Gulf skyline."},
    {"id": "london", "name": "London", "country": "United Kingdom", "x": 47.8, "y": 25.5, "image": "dest-london.jpg", "blurb": "Timeless architecture, world-class culture, and business at its center."},
    {"id": "paris", "name": "Paris", "country": "France", "x": 48.5, "y": 27.5, "image": "dest-paris.jpg", "blurb": "A city built for those who appreciate the art of living well."},
    {"id": "singapore", "name": "Singapore", "country": "Singapore", "x": 76.0, "y": 56.0, "image": "dest-singapore.jpg", "blurb": "Asia's gateway — precise, green, and endlessly ambitious."},
    {"id": "new-york", "name": "New York", "country": "United States", "x": 25.0, "y": 30.0, "image": "dest-newyork.jpg", "blurb": "The pulse of global business, day and night."},
    {"id": "tokyo", "name": "Tokyo", "country": "Japan", "x": 84.5, "y": 30.5, "image": "dest-tokyo.jpg", "blurb": "Precision and tradition, layered into every street."},
    {"id": "mumbai", "name": "Mumbai", "country": "India", "x": 66.0, "y": 48.5, "image": "dest-mumbai.jpg", "blurb": "A coastal capital of energy, commerce, and color."},
    {"id": "delhi", "name": "Delhi", "country": "India", "x": 67.5, "y": 43.0, "image": "dest-delhi.jpg", "blurb": "Centuries of history at the heart of a modern capital."},
    {"id": "maldives", "name": "Maldives", "country": "Maldives", "x": 65.0, "y": 58.0, "image": "dest-maldives.jpg", "blurb": "Private islands, private water, private time."},
]

TESTIMONIALS = [
    {"name": "Alexander Morgan", "location": "London, UK", "rating": 5, "quote": "Every detail was handled perfectly. The entire journey felt effortless from the first call to landing."},
    {"name": "Isabelle Laurent", "location": "Paris, France", "rating": 5, "quote": "I have flown privately for years — this was the first time the ground experience matched the aircraft."},
    {"name": "Rajiv Malhotra", "location": "Mumbai, India", "rating": 5, "quote": "Our itinerary changed twice in one week and the team simply adapted. Quietly excellent."},
    {"name": "Sofia Almeida", "location": "New York, USA", "rating": 5, "quote": "The cabin, the crew, the timing — nothing was left to chance. This is what private aviation should feel like."},
]

STATS = [
    {"value": 50, "suffix": "+", "label": "Aircraft Partners"},
    {"value": 120, "suffix": "+", "label": "Destinations"},
    {"value": 24, "suffix": "/7", "label": "Concierge Support"},
    {"value": 99, "suffix": "%", "label": "Service Satisfaction"},
]


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference TEXT UNIQUE NOT NULL,
                departure TEXT NOT NULL,
                destination TEXT NOT NULL,
                depart_date TEXT NOT NULL,
                return_date TEXT,
                passengers INTEGER NOT NULL,
                aircraft TEXT,
                full_name TEXT,
                email TEXT,
                phone TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS contact_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                departure TEXT,
                destination TEXT,
                travel_date TEXT,
                passengers INTEGER,
                message TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        db.commit()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def make_reference():
    return "AUR-" + datetime.utcnow().strftime("%y%m%d") + "-" + str(int(datetime.utcnow().timestamp()))[-4:]


def recommend_aircraft(passengers: int):
    """Return fleet options that can comfortably seat the requested party."""
    options = []
    for craft in FLEET:
        low = int(craft["passengers"].split("–")[0])
        high = int(craft["passengers"].split("–")[1])
        if passengers <= high:
            options.append({**craft, "fits": passengers >= low or True})
    return options or FLEET


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template(
        "index.html",
        fleet=FLEET,
        destinations=DESTINATIONS,
        testimonials=TESTIMONIALS,
        stats=STATS,
        current_year=datetime.utcnow().year,
    )


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/api/search", methods=["POST"])
def api_search():
    data = request.get_json(silent=True) or {}

    departure = (data.get("departure") or "").strip()
    destination = (data.get("destination") or "").strip()
    depart_date = (data.get("departDate") or "").strip()
    passengers_raw = data.get("passengers")

    errors = {}
    if not departure:
        errors["departure"] = "Please enter a departure city."
    if not destination:
        errors["destination"] = "Please enter a destination."
    if not depart_date:
        errors["departDate"] = "Please choose a departure date."
    try:
        passengers = int(passengers_raw)
        if passengers < 1 or passengers > 20:
            errors["passengers"] = "Enter a party size between 1 and 20."
    except (TypeError, ValueError):
        passengers = None
        errors["passengers"] = "Enter a valid number of passengers."

    if errors:
        return jsonify({"ok": False, "errors": errors}), 400

    options = recommend_aircraft(passengers)

    return jsonify(
        {
            "ok": True,
            "query": {
                "departure": departure,
                "destination": destination,
                "departDate": depart_date,
                "returnDate": data.get("returnDate"),
                "passengers": passengers,
            },
            "results": options,
        }
    )


@app.route("/api/book", methods=["POST"])
def api_book():
    data = request.get_json(silent=True) or {}

    required = ["departure", "destination", "departDate", "passengers"]
    errors = {f: "This field is required." for f in required if not str(data.get(f, "")).strip()}

    email = (data.get("email") or "").strip()
    if email and not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."

    try:
        passengers = int(data.get("passengers"))
    except (TypeError, ValueError):
        passengers = None
        errors["passengers"] = "Enter a valid number of passengers."

    if errors:
        return jsonify({"ok": False, "errors": errors}), 400

    reference = make_reference()
    db = get_db()
    db.execute(
        """INSERT INTO bookings
           (reference, departure, destination, depart_date, return_date, passengers,
            aircraft, full_name, email, phone, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            reference,
            data.get("departure", "").strip(),
            data.get("destination", "").strip(),
            data.get("departDate", "").strip(),
            (data.get("returnDate") or "").strip() or None,
            passengers,
            (data.get("aircraft") or "").strip() or None,
            (data.get("fullName") or "").strip() or None,
            email or None,
            (data.get("phone") or "").strip() or None,
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()

    return jsonify({"ok": True, "reference": reference})


@app.route("/api/contact", methods=["POST"])
def api_contact():
    data = request.get_json(silent=True) or {}

    errors = {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if not full_name:
        errors["fullName"] = "Please enter your name."
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    if not message:
        errors["message"] = "Please tell us a little about your journey."

    if errors:
        return jsonify({"ok": False, "errors": errors}), 400

    passengers = data.get("passengers")
    try:
        passengers = int(passengers) if passengers not in (None, "") else None
    except ValueError:
        passengers = None

    db = get_db()
    db.execute(
        """INSERT INTO contact_requests
           (full_name, email, phone, departure, destination, travel_date, passengers, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            full_name,
            email,
            (data.get("phone") or "").strip() or None,
            (data.get("departure") or "").strip() or None,
            (data.get("destination") or "").strip() or None,
            (data.get("travelDate") or "").strip() or None,
            passengers,
            message,
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()

    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
else:
    init_db()
