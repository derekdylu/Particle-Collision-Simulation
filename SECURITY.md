# Security Policy

## Supported version

Only the current `main` branch is supported.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting or Security Advisory feature for this repository. Do not open a public issue for a vulnerability involving physical equipment, network access, credentials, private device addresses, or recordings.

Include the affected component, impact, safe reproduction conditions, and a suggested mitigation. Do not test against equipment or networks you do not own or have permission to use.

## Operational boundary

The hardware API is an archival snapshot designed for its original trusted, isolated lab machine. It initializes physical devices during startup and does not provide authentication. Do not expose it to an untrusted network or run it without the original safety procedures.
