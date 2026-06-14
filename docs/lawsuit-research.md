# Lawsuit Research & Project Background

> This document holds the narrative background and the legal-research brief that
> motivate this project. It was moved out of `CLAUDE.md` so that file stays lean
> and operational. Nothing here is build/runtime guidance — it's context and
> source material for the lawsuit this tool supports.

## Background

My brother lives in Phoenix, AZ and spends a lot of time in his backyard. For
years now, he has noticed that police helicopters regularly, without any seeming
emergency or reason, fly over his neighborhood (including his yard) in what
appears to be purely surveillance. One night, he was in his backyard and a
helicopter stopped, shined a light on him, then moved on.

My brother is also a lawyer, and that seems to have been his tipping point for
filing a lawsuit against the city in an attempt to get them to stop surveilling
Phoenix residents for no good reason. The police have also done things like the
["Alex" skywriting stunt][alex] — flying for roughly two hours to spell a name
with their flight path — which shows a blatant disregard for professionalism. In
a city the size of Phoenix, it seems impossible there weren't legitimate calls
for that helicopter's assistance denied during the stunt.

[alex]: https://www.phoenixnewtimes.com/news/phoenix-police-chopper-writes-name-alex-in-middle-of-night-22097889

### The issue we're trying to solve

To jump-start the information-collecting process for this upcoming lawsuit, he
needs as much data as he can get about the police department helicopters — their
routes, communications, cost per flight, how they decide where to go, etc. Most
of this is theoretically attainable via discovery during the lawsuit, but it
would be ideal to find as much as possible beforehand from public sources.

**Data assumptions for this project:**

- We have a **FlightRadar24 Gold subscription**, which gives ~1 year of flight
  logs for any aircraft in KML or CSV format (and possibly other useful data).
- We assume we obtain everything listed as possible to get under **Arizona's
  Open Records Law** (A.R.S. § 39-121).

---

## Legal Research Brief

> The original prompt to claude.ai was: *"Can you suggest information that may be
> helpful for this kind of lawsuit, using your knowledge of the kind of data
> available (public or attainable through discovery)? Please include links or
> information about how to get this information in your answer if possible."*
>
> The response below is preserved as reference material. Figures and contacts are
> as of the original research and should be re-verified before relying on them.

### Challenging Phoenix Police Helicopter Surveillance: A Comprehensive Legal Research Guide

A lawsuit challenging warrantless helicopter surveillance by Phoenix Police
Department could set important precedents for privacy rights and government
accountability. Recent events like the unexplained "Alex" skywriting incident
over Maryvale demonstrate the need for oversight of the Phoenix PD's **28-pilot
Air Support Unit** operating **5 Airbus H125 helicopters** with advanced
surveillance capabilities.

#### Phoenix police helicopter operations: data sources and public records strategy

Phoenix Police Department maintains extensive helicopter operations records that
are legally obtainable through Arizona's Open Records Law (A.R.S. § 39-121). The
department's **Air Support Unit operates from Phoenix-Deer Valley Airport**,
flying approximately **8,000 hours annually** with 24/7 coverage. Through the
Phoenix Police Public Records Portal (phxpublicsafety.phoenix.gov), you can
request flight logs, dispatch records, maintenance logs, pilot certifications,
and Standard Operating Procedures. The portal charges a $5 convenience fee, with
typical response times of 5-10 business days for simple requests.

The most strategic approach involves submitting targeted requests for specific
data categories. Flight operations records should include daily logs showing
aircraft identification, flight duration, and general area of operation.
**Computer Aided Dispatch (CAD) records** reveal response locations and incident
types. Budget documents accessible through Phoenix.gov/budget show the Air
Support Unit's annual allocation within the police department's **$1.027+ billion
budget**. Phoenix City Council meeting minutes, searchable at
phoenix.legistar.com, contain discussions about helicopter purchases including
the recent **$18 million fleet modernization** replacing older AS350B3s with new
H125 helicopters.

For maximum effectiveness, craft requests that reference known incidents and
specific aircraft registration numbers. The confirmed registration **N624FB** was
involved in the July 10, 2025 "Alex" skywriting incident over Maryvale, providing
a concrete starting point. Contact the Phoenix Police Public Records Unit at
(602) 534-1127 or policepublicrecords@phoenix.gov, with the Arizona
Ombudsman-Citizens' Aide available for assistance with disputes.

#### Legal precedents create openings for constitutional challenges

The Supreme Court's aerial surveillance framework from *California v. Ciraolo*
(1986) and *Florida v. Riley* (1989) permits warrantless observation from
navigable airspace, but recent developments offer promising avenues. The **Fourth
Circuit's 2022 decision in *Leaders of a Beautiful Struggle v. Baltimore Police
Department*** ruled that persistent aerial surveillance violates the Fourth
Amendment, applying *Carpenter v. United States* principles to extended location
tracking. This precedent directly supports challenging systematic helicopter
patrol patterns over Phoenix neighborhoods.

*Florida v. Riley* specifically noted that helicopter surveillance causing
**"undue noise, wind, dust, or threat of injury"** could violate the Fourth
Amendment. The New Mexico Supreme Court in *State v. Davis* (2015) found that
helicopter surveillance at 50 feet violated constitutional rights due to physical
intrusiveness. Justice O'Connor's *Riley* concurrence emphasized that
surveillance below 400 feet might violate reasonable expectations of privacy if
such flights are "sufficiently rare."

Technology enhancement provides another constitutional hook. *Kyllo v. United
States* established that using technology "not in general public use" to observe
home details constitutes a search. Phoenix PD's H125 helicopters equipped with
**FLIR cameras, digital mapping platforms, and 17-inch touchscreens** for
tactical officers exceed naked-eye observation capabilities, potentially
triggering *Kyllo* protections. The combination of extended hovering,
low-altitude operations, technological enhancement, and pattern surveillance
creates multiple Fourth Amendment arguments unavailable in earlier cases.

#### Phoenix Air Support Unit structure reveals accountability gaps

Phoenix PD operates one of the nation's most sophisticated air units with **5
Airbus H125 helicopters, 1 Agusta A109E twin-engine, and multiple fixed-wing
aircraft** including Pilatus PC-12NG surveillance planes. The unit's 28 pilots
and tactical flight officers respond to 12,000+ calls annually, assisting with
2,500 arrests and 400 vehicle pursuits in 2024. Operating costs reach
approximately **$2,160 per flight hour** based on media estimates, with the fleet
accumulating $33 million in costs over recent decades.

The July 10, 2025 "Alex" skywriting incident exemplifies accountability concerns.
Helicopter N624FB departed Deer Valley Airport at 11:30 PM, spent 45 minutes
spelling "ALEX" over the predominantly Hispanic Maryvale neighborhood below 2,000
feet, then landed at 1:17 AM after a **1 hour 48-minute flight costing an
estimated $2,160**. Phoenix PD never responded to media inquiries, announced no
disciplinary action, and implemented no policy changes.

Department oversight mechanisms include the Professional Standards Bureau for
complaints and a 2021-created Compliance and Oversight Bureau. However, a June
2024 Department of Justice investigation found patterns of excessive force and
discrimination against communities of color. A city audit recommended fleet
reduction to save $3.3 million annually. Despite transparency portals showing
crime statistics and officer-involved shootings, **specific aerial surveillance
policies remain unavailable**, with no community notification requirements for
routine helicopter operations.

#### Aviation tracking tools provide real-time surveillance documentation

Multiple platforms enable tracking Phoenix police helicopters, with ADS-B
Exchange (globe.adsbexchange.com) offering the most comprehensive coverage.
Unlike FlightRadar24 or FlightAware which filter government aircraft, **ADS-B
Exchange provides unfiltered tracking** of all transponder-equipped aircraft.
Click the "U" button to display only military/government traffic, then focus on
Phoenix-Deer Valley Airport where police helicopters are based.

Federal Aviation Administration resources supplement real-time tracking. The FAA
Aircraft Registry (registry.faa.gov/aircraftinquiry) provides registration
details for all Phoenix PD aircraft. Submit FOIA requests through
faa.gov/foia/foia_request for historical flight records, though processing may
take weeks. LiveATC.net streams Phoenix area air traffic control communications,
with helicopter air-to-air frequencies at **123.0250 MHz**.

Building your own ADS-B receiver for approximately $150-200 using a Raspberry Pi
and RTL-SDR dongle provides continuous monitoring capability and premium access
to tracking platforms. Document all observations with timestamps for legal
purposes. Note that police can legally disable ADS-B transponders under 14 CFR
91.225(f)(1) for law enforcement purposes, making multiple tracking methods
essential.

#### Civil liberties organizations offer litigation expertise and resources

The **ACLU of Arizona** (602-650-1854) brings direct experience challenging
aerial surveillance, having investigated police drone use statewide and
documented Border Patrol helicopter harassment. Legal Director Jared G. Keenan
oversees litigation with four staff attorneys. Their intake process through
acluaz.org prioritizes cases with statewide constitutional impact. The national
ACLU successfully challenged Baltimore's aerial surveillance program, with Senior
Policy Analyst Jay Stanley and Senior Staff Attorney Ashley Gorski providing
aerial surveillance expertise.

The **Electronic Frontier Foundation** (legal-intake@eff.org) maintains the Atlas
of Surveillance database tracking 1,172+ police departments using drones
nationwide. Their Street Level Surveillance Hub provides comprehensive
surveillance technology analysis. EFF accepts cases involving novel surveillance
technologies with broad constitutional implications. Senior Policy Analyst
Matthew Guariglia specializes in drone surveillance issues.

Arizona-specific resources include the **Arizona Center for Law in the Public
Interest** (602-258-8850), with 50+ years of precedent-setting litigation
entirely donor-funded without client fees. ASU's Sandra Day O'Connor College of
Law First Amendment Clinic, directed by Professor James Weinstein with an
advisory board including ACLU Arizona's Legal Director, provides student
representation under faculty supervision. The clinic's focus on First Amendment
issues aligns with challenging surveillance's chilling effects on protected
activities.

For government accountability support, **Common Cause Arizona** advocates for
transparency measures and has fought attempts to destroy public records. Arizona
PIRG focuses on government accountability through grassroots organizing. The
Electronic Privacy Information Center (202-483-1140) filed the first drone
surveillance opposition and supports Fourth Amendment protections through amicus
briefs and FOIA litigation.

#### Strategic roadmap for mounting the legal challenge

Begin immediately with comprehensive public records requests to Phoenix PD, the
City of Phoenix, and Maricopa County Sheriff. Request flight logs for the past
two years, focusing on specific neighborhoods experiencing heavy surveillance.
Include requests for the July 10, 2025 "Alex" incident investigation records.
Simultaneously, set up ADS-B Exchange monitoring to document current flight
patterns, preserving all data with timestamps.

Contact ACLU of Arizona for case intake, emphasizing the statewide constitutional
implications and patterns of discriminatory surveillance in communities of color.
Submit parallel intake requests to EFF for technology expertise and ASU's First
Amendment Clinic for local academic support. Build a coalition similar to
Baltimore's successful challenge, identifying affected community members willing
to serve as plaintiffs who can demonstrate concrete surveillance harms.

Develop legal arguments extending *Carpenter* location-privacy protections to
systematic aerial surveillance, emphasizing the qualitative difference between
occasional overflights and persistent pattern surveillance. Document First
Amendment harms to protest activities and community organizing, particularly in
light of DOJ findings about discriminatory policing. Research Arizona
constitutional provisions that may provide stronger privacy protections than
federal law.

Focus discovery on obtaining Air Support Unit policies, training materials, and
decision-making processes for deployment. Request data on flight patterns by
neighborhood demographics to establish discriminatory impact. Document physical
intrusion effects including noise levels, wind disturbance, and community fear.
Gather evidence of technology capabilities beyond naked-eye observation.

Success requires combining traditional Fourth Amendment arguments with modern
privacy frameworks recognizing aggregate surveillance harms. The Baltimore
precedent provides a roadmap, but Phoenix's specific circumstances — including
the unexplained "Alex" incident, DOJ discrimination findings, and sophisticated
surveillance fleet — create unique opportunities for expanding privacy
protections.
