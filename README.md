# Aurelia — Private Aviation Website

A dark-luxury private aviation site built with Flask, vanilla JS, and GSAP ScrollTrigger.

## Run it

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 app.py
```

Then open http://127.0.0.1:5000

The SQLite database (`database/airline.db`) is created automatically on first run.

## What's real vs. decorative

- **Flight search** (`/api/search`) validates input server-side and returns aircraft
  recommendations sized to your party.
- **Booking requests** (`/api/book`) and the **contact form** (`/api/contact`) write
  to SQLite (`bookings` and `contact_requests` tables) and return a confirmation
  reference — check `database/airline.db` to see submissions land.
- Destination images, aircraft photography, and the cabin/hero backdrop are built
  from CSS gradients rather than stock photography, so the project runs standalone
  with no external image dependencies. Drop real photography into `static/images/`
  and swap the `.fleet-card-image-fill`, `.hero-jet`, `.cabin-bg`, and
  `.dest-info-image` rules in `static/css/style.css` for a photographic look.

## Structure

```
app.py                 Flask routes + SQLite models + seed content (fleet, destinations, testimonials)
config.py               App config
templates/index.html    Full one-page site (nav → hero → booking → fleet → destinations →
                         experience → cabin → stats → process → testimonials → final CTA → contact → footer)
static/css/style.css    Design tokens, layout, responsive rules, prefers-reduced-motion
static/js/main.js       Loader, nav scroll state, mobile menu, custom cursor
static/js/animations.js GSAP ScrollTrigger reveals, parallax, animated stat counters
static/js/booking.js    Search/booking/contact fetch calls, aircraft modal, destination
                         map, cabin hotspots, testimonial carousel
```

## Extending

- Add real photography by dropping files into `static/images/` and referencing them
  from the CSS `background-image` rules noted above.
- Split `templates/index.html` into `fleet.html` / `destinations.html` / etc. if you
  want dedicated pages later — the Flask routes and seed data in `app.py` are already
  structured to support that.
