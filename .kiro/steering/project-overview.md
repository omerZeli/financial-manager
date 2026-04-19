---
inclusion: always
---

# Project Overview – Financial Manager

## Language & Direction
- The entire UI is in **Hebrew**.
- Layout direction is **RTL** (right-to-left).

## Purpose
A personal financial manager that lets the user record financial data through guided flows and view that data through various display components.

## Architecture – Two Main Pages

### 1. Flows Page (תהליכים)
- Displays a list of available flows.
- Each flow is a small form with predefined fields that the user fills in manually.
- On submission, the form data is saved to the supabase database in a consistent, structured format.

### 2. Data Page (נתונים)
- Displays a list of available supabase data components.
- Each data component visualizes the user's stored data in a specific, consistent way (tables, charts, summaries, etc.).

## Key Principles
- Flows produce data; Data components consume it.
- Every flow writes to the DB in a well-defined schema so any data component can reliably read it.
- Keep the UI simple, clean, and accessible in Hebrew/RTL.
