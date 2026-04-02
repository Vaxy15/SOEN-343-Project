# User Testing - CityCircuit

User testing validates that real users can complete key tasks without confusion.
This is manual acceptance testing - a tester follows each scenario and records the result.

---

## Test Environment

- URL: http://localhost:3000
- Browser: Chrome (latest)
- Test accounts:
  - Regular user: register a new account during testing
  - Admin user: use an existing approved admin account

---

## Scenario 1 - User Registration and Login

**Goal:** A new user can create an account and log in.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to /auth/register | Registration form is visible | |
| 2 | Enter name, email, password and click Create account | Redirected to login page | |
| 3 | Enter credentials and click Sign in | Redirected to home page, name visible in navbar | |
| 4 | Click the user menu | Dropdown shows email and Sign out option | |

---

## Scenario 2 - Plan a Transit Trip

**Goal:** A logged-in user can plan a transit trip between two Montreal addresses.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to /planner | Map is visible, two address pickers shown | |
| 2 | Type McGill University in Origin and select suggestion | Origin marker A appears on map | |
| 3 | Type Old Montreal in Destination and select suggestion | Destination marker B appears on map | |
| 4 | Click Plan Trip | Transit route drawn on map, steps listed below | |
| 5 | Check route info panel | Duration, distance, and transit steps are shown | |

---

## Scenario 3 - Reserve a BIXI Bike

**Goal:** A logged-in user can reserve a bike at a BIXI station.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to /rent | Map shows BIXI stations, station list visible | |
| 2 | Click a marker with available bikes | Station details panel shows bike count | |
| 3 | Click Reserve | Redirected to payment page | |
| 4 | Enter mock card details (4111 1111 1111 1111, 12/27, 123) | Payment form accepts input | |
| 5 | Click Pay 4.99 | Success animation shown, redirected to order page | |
| 6 | Navigate back to /rent | Reservation status shows active station name | |
| 7 | Check bike count at reserved station | Count decreased by 1 | |

---

## Scenario 4 - Return a Bike

**Goal:** A user with an active reservation can return their bike.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to /rent with active reservation | Return Bike button is visible | |
| 2 | Click Return Bike | Reservation status clears | |
| 3 | Check bike count at previously reserved station | Count restored by 1 | |

---

## Scenario 5 - Reserve a Parking Spot

**Goal:** A logged-in user can reserve a parking spot.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to /parking | Map shows parking locations | |
| 2 | Click a map marker | Details panel shows location name and address | |
| 3 | Click Reserve | Redirected to payment page | |
| 4 | Complete mock payment | Redirected to order confirmation | |
| 5 | Navigate back to /parking | Reservation status shows active parking name | |

---

## Scenario 6 - View Account Dashboard

**Goal:** A user can view their spending history and carbon savings.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to /account | Dashboard loads with user name | |
| 2 | Check stat cards | Total spent, bikes reserved, parking booked shown | |
| 3 | Check carbon footprint card | CO2 saved is displayed with equivalents | |
| 4 | Check activity chart | Bar chart shows reservation history | |
| 5 | Check recent orders section | Last 5 orders listed with amounts | |

---

## Scenario 7 - Admin Panel Access

**Goal:** An approved admin can access the admin dashboard and manage vehicles.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Log in as approved admin | Admin and Vehicles links visible in navbar | |
| 2 | Navigate to /admin | Dashboard shows trip plans, reservations, metrics | |
| 3 | Navigate to /admin/vehicles | Vehicle list is shown | |
| 4 | Fill in the Add Vehicle form and click Add vehicle | New station appears in list | |
| 5 | Navigate to /rent | New station appears on the map | |
| 6 | Click + on vehicle availability | Count increments in the table | |

---

## Scenario 8 - Prevent Duplicate Reservation

**Goal:** The system prevents a user from holding two active reservations of the same type.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Reserve a bike (has active reservation) | Reserve button shows Already reserved on all stations | |
| 2 | Return the bike | Reserve buttons become active again | |

---

## Scenario 9 - Unauthenticated Access

**Goal:** Unauthenticated users are redirected to login for protected pages.

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Log out | Redirected to home page | |
| 2 | Navigate to /account | Redirected to /auth/login?next=/account | |
| 3 | Navigate to /admin | Redirected or shown forbidden error | |
| 4 | Try to reserve a bike without logging in | Redirected to login page | |

---

## Results Summary

| Scenario | Tester | Date | Result | Notes |
|---|---|---|---|---|
| 1 - Registration | | | | |
| 2 - Trip Planner | | | | |
| 3 - Bike Reservation | | | | |
| 4 - Bike Return | | | | |
| 5 - Parking Reservation | | | | |
| 6 - Account Dashboard | | | | |
| 7 - Admin Panel | | | | |
| 8 - Duplicate Prevention | | | | |
| 9 - Unauthenticated Access | | | | |
