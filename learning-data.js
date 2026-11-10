'use strict';

// Trades/career guides and original DC/MD/VA permit-practice questions written from official manuals and agency sources.
// Facts are simplified for learners; rules change, so the UI always points players to the official source.
const LearningData = {
 "trades": [
  {
   "id": "plumbing",
   "title": "Plumbing",
   "icon": "🔧",
   "category": "Skilled Trades",
   "facts": [
    {
     "text": "Plumbers install and repair pipes that carry water, gas, and waste in homes and buildings.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm"
    },
    {
     "text": "A P-trap holds a small amount of water to block sewer gases from entering a building through drains.",
     "source": "https://www.osha.gov/plumbing"
    },
    {
     "text": "Proper drain venting lets air into the pipe system so wastewater flows smoothly and traps don't get siphoned dry.",
     "source": "https://www.osha.gov/plumbing"
    },
    {
     "text": "Most plumbers learn through a registered apprenticeship combining paid on-the-job training with classroom instruction.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/plumber"
    },
    {
     "text": "Licensing requirements vary by state/locality — DC, Maryland, and Virginia each set their own plumber licensing rules.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/plumber"
    },
    {
     "text": "The median annual wage for plumbers, pipefitters, and steamfitters was about $61,550 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm"
    },
    {
     "text": "Job outlook for plumbers is projected to grow, often cited as faster than average, due to ongoing construction and maintenance needs.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm"
    },
    {
     "text": "Always shut off the water supply before working on a fixture, and wear eye protection when cutting or soldering pipe.",
     "source": "https://www.osha.gov/plumbing"
    }
   ],
   "mnemonic": "\"No trap, no job\" — every drain needs a P-trap to keep sewer gas out.",
   "quiz": [
    {
     "question": "What is the main purpose of a P-trap under a sink?",
     "choices": [
      "To make the pipe look nicer",
      "To hold water that blocks sewer gas from entering the room",
      "To speed up drainage",
      "To filter out hair and debris only"
     ],
     "answer": 1,
     "explanation": "A P-trap retains a water seal that blocks sewer gases from backing up into the building."
    },
    {
     "question": "Why do drain systems need venting?",
     "choices": [
      "To make noise when water drains",
      "To let air in so water flows properly and traps aren't siphoned dry",
      "To cool the pipes",
      "Venting is not actually needed"
     ],
     "answer": 1,
     "explanation": "Vents equalize air pressure so wastewater drains smoothly without pulling the trap's water seal out."
    },
    {
     "question": "How do most people become licensed plumbers?",
     "choices": [
      "Only a 4-year college degree",
      "A registered apprenticeship combining paid work experience and classroom training",
      "No training is required",
      "Only an online course"
     ],
     "answer": 1,
     "explanation": "Apprenticeships combining paid on-the-job training and classroom instruction are the standard path into plumbing."
    },
    {
     "question": "Before repairing a fixture, a plumber should first:",
     "choices": [
      "Turn off the water supply to the fixture",
      "Leave the water running",
      "Call a customer service line",
      "Remove all pipes immediately"
     ],
     "answer": 0,
     "explanation": "Shutting off water supply prevents flooding and makes repairs safer."
    },
    {
     "question": "True or false: plumber licensing requirements are identical in every U.S. state.",
     "choices": [
      "True",
      "False",
      "Only true for DC",
      "Only true for federal contracts"
     ],
     "answer": 1,
     "explanation": "Licensing rules differ by state and locality, so DC, Maryland, and Virginia each have their own requirements."
    }
   ]
  },
  {
   "id": "electrician",
   "title": "Electrician",
   "icon": "⚡",
   "category": "Skilled Trades",
   "facts": [
    {
     "text": "Electricians install, maintain, and repair electrical power, lighting, and control systems.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/electricians.htm"
    },
    {
     "text": "Ohm's Law describes the relationship between voltage, current, and resistance: Voltage = Current × Resistance (V = I × R).",
     "source": "https://www.nist.gov/pml/owm/si-units-electric-current"
    },
    {
     "text": "Always de-energize and lock out/tag out a circuit before working on it to prevent electric shock.",
     "source": "https://www.osha.gov/control-hazardous-energy"
    },
    {
     "text": "Electricians typically train through a registered apprenticeship lasting several years combining classroom and on-the-job hours.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/electrician"
    },
    {
     "text": "Most states, including DC, Maryland, and Virginia, require electricians to be licensed, though specific rules differ by jurisdiction.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/electrician"
    },
    {
     "text": "The median annual wage for electricians was about $61,590 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/electricians.htm"
    },
    {
     "text": "Electrician employment is projected to grow faster than the average for all occupations.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/electricians.htm"
    },
    {
     "text": "Rubber-insulated gloves and non-contact voltage testers are basic safety tools used to avoid shock hazards.",
     "source": "https://www.osha.gov/electrical"
    }
   ],
   "mnemonic": "\"Volts push, Ohms resist, Amps flow\" — remember V = I × R.",
   "quiz": [
    {
     "question": "What does Ohm's Law state?",
     "choices": [
      "Voltage equals current divided by power",
      "Voltage equals current multiplied by resistance (V = I × R)",
      "Resistance equals voltage times current",
      "There is no fixed relationship between these values"
     ],
     "answer": 1,
     "explanation": "Ohm's Law: V = I × R, relating voltage, current, and resistance."
    },
    {
     "question": "Before working on a circuit, an electrician should first:",
     "choices": [
      "Leave it energized to test it live",
      "De-energize the circuit and use lockout/tagout procedures",
      "Wear sandals for comfort",
      "Skip testing with a voltage tester"
     ],
     "answer": 1,
     "explanation": "Lockout/tagout prevents the circuit from being accidentally re-energized while someone is working on it."
    },
    {
     "question": "How do most electricians typically become licensed?",
     "choices": [
      "Through a registered apprenticeship combining classroom and on-the-job training",
      "By watching online videos only",
      "No training is required anywhere",
      "Only through a 2-year associate degree, with no apprenticeship"
     ],
     "answer": 0,
     "explanation": "Apprenticeships are the standard pathway into the electrical trade in the U.S."
    },
    {
     "question": "What tool helps an electrician check whether a wire is energized without direct contact?",
     "choices": [
      "A hammer",
      "A non-contact voltage tester",
      "A tape measure",
      "A paintbrush"
     ],
     "answer": 1,
     "explanation": "Non-contact voltage testers detect live wires without requiring direct contact."
    },
    {
     "question": "True or false: electrician licensing rules are exactly the same in DC, Maryland, and Virginia.",
     "choices": [
      "True",
      "False",
      "Only true for DC and Maryland",
      "Only true for commercial work"
     ],
     "answer": 1,
     "explanation": "Each jurisdiction sets its own specific licensing requirements for electricians."
    }
   ]
  },
  {
   "id": "construction-carpentry",
   "title": "Construction & Carpentry",
   "icon": "🏗️",
   "category": "Skilled Trades",
   "facts": [
    {
     "text": "Carpenters construct, install, and repair building frameworks and structures made of wood and other materials.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/carpenters.htm"
    },
    {
     "text": "\"Measure twice, cut once\" reflects the importance of precise measurement to avoid wasting materials.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/carpenter"
    },
    {
     "text": "Wall studs in residential framing are commonly spaced 16 inches on center (or sometimes 24 inches) for structural consistency.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/carpenter"
    },
    {
     "text": "Fall protection (guardrails, harnesses) is required on many construction sites where workers are exposed to falls of 6 feet or more.",
     "source": "https://www.osha.gov/fall-protection"
    },
    {
     "text": "Carpenters often train through registered apprenticeships combining paid work with technical instruction.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/carpenter"
    },
    {
     "text": "The median annual wage for carpenters was about $56,350 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/carpenters.htm"
    },
    {
     "text": "Carpentry employment is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/construction-and-extraction/carpenters.htm"
    },
    {
     "text": "Hard hats, safety glasses, and steel-toe boots are standard personal protective equipment (PPE) on construction sites.",
     "source": "https://www.osha.gov/personal-protective-equipment"
    }
   ],
   "mnemonic": "\"Measure twice, cut once\" — and keep studs 16 inches on center.",
   "quiz": [
    {
     "question": "What does the phrase 'measure twice, cut once' emphasize?",
     "choices": [
      "Cutting quickly to save time",
      "Double-checking measurements before cutting to avoid mistakes and waste",
      "Measuring only after cutting",
      "Ignoring measurements for small cuts"
     ],
     "answer": 1,
     "explanation": "Precise, double-checked measurements prevent costly cutting errors."
    },
    {
     "question": "In standard residential wall framing, studs are commonly spaced how far apart (on center)?",
     "choices": [
      "4 inches",
      "16 inches",
      "48 inches",
      "100 inches"
     ],
     "answer": 1,
     "explanation": "16 inches on center is a standard residential stud spacing (24 inches is also used in some framing)."
    },
    {
     "question": "OSHA generally requires fall protection measures when workers are exposed to falls of how many feet or more in construction?",
     "choices": [
      "1 foot",
      "6 feet",
      "50 feet",
      "There is no height threshold"
     ],
     "answer": 1,
     "explanation": "OSHA's construction standard generally triggers fall protection requirements at 6 feet of exposure."
    },
    {
     "question": "Which of these is standard PPE on a construction site?",
     "choices": [
      "Flip-flops",
      "Hard hat, safety glasses, and steel-toe boots",
      "Headphones with no other gear",
      "Short sleeves only"
     ],
     "answer": 1,
     "explanation": "Hard hats, eye protection, and steel-toe boots are standard required PPE on many job sites."
    },
    {
     "question": "How do many carpenters enter the trade?",
     "choices": [
      "Only through a 4-year university degree",
      "Through a registered apprenticeship combining paid work and classroom training",
      "Carpentry requires no training at all",
      "Only by inheriting a family business"
     ],
     "answer": 1,
     "explanation": "Apprenticeships are a standard, structured path into carpentry."
    }
   ]
  },
  {
   "id": "hvac",
   "title": "HVAC Technician",
   "icon": "❄️",
   "category": "Skilled Trades",
   "facts": [
    {
     "text": "HVAC technicians install, maintain, and repair heating, ventilation, air conditioning, and refrigeration systems.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm"
    },
    {
     "text": "Technicians must follow refrigerant handling rules because many refrigerants are regulated for environmental and safety reasons.",
     "source": "https://www.epa.gov/section608"
    },
    {
     "text": "EPA Section 608 certification is generally required for technicians who work with refrigerants in the U.S.",
     "source": "https://www.epa.gov/section608"
    },
    {
     "text": "HVAC training commonly combines trade school or community college coursework with a registered apprenticeship.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/hvac-technician"
    },
    {
     "text": "Licensing for HVAC technicians varies by state/locality; DC, Maryland, and Virginia each have their own rules.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/hvac-technician"
    },
    {
     "text": "The median annual wage for HVAC mechanics and installers was about $57,300 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm"
    },
    {
     "text": "Employment for HVAC technicians is projected to grow faster than average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm"
    },
    {
     "text": "Always de-energize electrical components and relieve pressure in refrigerant lines before servicing equipment.",
     "source": "https://www.osha.gov/control-hazardous-energy"
    }
   ],
   "mnemonic": "\"Cool heads, sealed refrigerant\" — always get Section 608 certified before handling refrigerants.",
   "quiz": [
    {
     "question": "What certification is generally required to legally handle refrigerants in HVAC work in the U.S.?",
     "choices": [
      "A regular driver's license",
      "EPA Section 608 certification",
      "A food handler's permit",
      "No certification is required"
     ],
     "answer": 1,
     "explanation": "EPA Section 608 certification is the standard federal requirement for technicians handling refrigerants."
    },
    {
     "question": "What does an HVAC technician primarily work on?",
     "choices": [
      "Plumbing fixtures only",
      "Heating, ventilation, air conditioning, and refrigeration systems",
      "Electrical wiring in cars",
      "Road construction"
     ],
     "answer": 1,
     "explanation": "HVAC stands for Heating, Ventilation, and Air Conditioning, plus related refrigeration systems."
    },
    {
     "question": "Why is refrigerant handling regulated?",
     "choices": [
      "Because refrigerants have no environmental impact",
      "Because many refrigerants pose environmental and safety risks if mishandled",
      "Because refrigerants are edible",
      "There is no regulation on refrigerants"
     ],
     "answer": 1,
     "explanation": "Refrigerants can harm the environment (e.g., ozone depletion, global warming potential) and pose safety hazards, so handling is regulated."
    },
    {
     "question": "What is a common path into the HVAC trade?",
     "choices": [
      "Trade school or community college plus a registered apprenticeship",
      "No training of any kind",
      "Only a weekend seminar",
      "A 4-year law degree"
     ],
     "answer": 0,
     "explanation": "Many HVAC technicians combine technical coursework with hands-on apprenticeship training."
    },
    {
     "question": "Before servicing HVAC equipment, a technician should:",
     "choices": [
      "Leave electrical power on for convenience",
      "De-energize electrical components and relieve line pressure as appropriate",
      "Ignore lockout procedures",
      "Work only at night"
     ],
     "answer": 1,
     "explanation": "De-energizing equipment and relieving pressure reduces the risk of shock or injury during servicing."
    }
   ]
  },
  {
   "id": "it-support",
   "title": "IT Support & Help Desk",
   "icon": "💻",
   "category": "Technology",
   "facts": [
    {
     "text": "Help desk/support technicians troubleshoot computer hardware, software, and network issues for users.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/computer-support-specialists.htm"
    },
    {
     "text": "The OSI model describes 7 layers of network communication: Physical, Data Link, Network, Transport, Session, Presentation, Application.",
     "source": "https://www.comptia.org/content/articles/what-is-the-osi-model"
    },
    {
     "text": "A standard troubleshooting approach is: identify the problem, establish a theory, test the theory, plan and implement a solution, verify, and document.",
     "source": "https://www.comptia.org/certifications/a"
    },
    {
     "text": "CompTIA A+ is a widely recognized entry-level certification for IT support roles.",
     "source": "https://www.comptia.org/certifications/a"
    },
    {
     "text": "Many IT support roles don't require a 4-year degree; certifications and hands-on skills are often sufficient to start.",
     "source": "https://www.comptia.org/certifications/a"
    },
    {
     "text": "The median annual wage for computer support specialists was about $59,660 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/computer-support-specialists.htm"
    },
    {
     "text": "Employment for computer support specialists is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/computer-support-specialists.htm"
    },
    {
     "text": "Good help desk practice includes clear communication, patience, and careful documentation of each issue and its resolution.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/computer-support-specialists.htm"
    }
   ],
   "mnemonic": "\"Please Do Not Throw Sausage Pizza Away\" — remembers OSI layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.",
   "quiz": [
    {
     "question": "How many layers does the OSI model have?",
     "choices": [
      "3",
      "5",
      "7",
      "10"
     ],
     "answer": 2,
     "explanation": "The OSI model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application."
    },
    {
     "question": "What is a common first step in IT troubleshooting?",
     "choices": [
      "Replace all hardware immediately",
      "Identify the problem by gathering information from the user",
      "Reboot the entire network without investigation",
      "Ignore the user's description"
     ],
     "answer": 1,
     "explanation": "Effective troubleshooting starts with clearly identifying the problem based on user-reported symptoms."
    },
    {
     "question": "Which certification is commonly recommended as an entry point into IT support?",
     "choices": [
      "CompTIA A+",
      "A medical license",
      "A real estate license",
      "A commercial driver's license"
     ],
     "answer": 0,
     "explanation": "CompTIA A+ is a widely recognized foundational certification for IT support careers."
    },
    {
     "question": "Why is documentation important in help desk work?",
     "choices": [
      "It is not important",
      "It helps track resolutions and assists with future similar issues",
      "It replaces the need to talk to users",
      "It is only for billing purposes"
     ],
     "answer": 1,
     "explanation": "Good documentation helps technicians and teams track solutions and resolve recurring issues faster."
    },
    {
     "question": "Is a 4-year college degree always required for entry-level IT support jobs?",
     "choices": [
      "Yes, always required",
      "No — certifications and practical skills are often sufficient",
      "Only for government jobs",
      "Only if over age 30"
     ],
     "answer": 1,
     "explanation": "Many IT support roles accept relevant certifications and hands-on skills in place of a 4-year degree."
    }
   ]
  },
  {
   "id": "cybersecurity",
   "title": "Cybersecurity",
   "icon": "🛡️",
   "category": "Technology",
   "facts": [
    {
     "text": "Information security analysts protect computer systems and networks from cyberattacks and unauthorized access.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm"
    },
    {
     "text": "The CIA triad — Confidentiality, Integrity, Availability — is a foundational model for information security goals.",
     "source": "https://csrc.nist.gov/glossary/term/cia_triad"
    },
    {
     "text": "NIST provides widely used cybersecurity frameworks and guidance for organizations to manage security risk.",
     "source": "https://www.nist.gov/cyberframework"
    },
    {
     "text": "Strong, unique passwords and multi-factor authentication (MFA) significantly reduce the risk of unauthorized account access.",
     "source": "https://www.cisa.gov/secure-our-world/use-strong-passwords"
    },
    {
     "text": "CompTIA Security+ is a commonly recognized entry-level certification for cybersecurity roles.",
     "source": "https://www.comptia.org/certifications/security"
    },
    {
     "text": "The median annual wage for information security analysts was about $120,360 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm"
    },
    {
     "text": "Employment for information security analysts is projected to grow much faster than average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm"
    },
    {
     "text": "Phishing — tricking someone into clicking a malicious link or revealing credentials — remains one of the most common attack methods.",
     "source": "https://www.cisa.gov/topics/cyber-threats-and-advisories/phishing"
    }
   ],
   "mnemonic": "\"CIA\" protects your data: Confidentiality, Integrity, Availability.",
   "quiz": [
    {
     "question": "What does the CIA triad stand for in cybersecurity?",
     "choices": [
      "Central Intelligence Agency",
      "Confidentiality, Integrity, Availability",
      "Computers, Internet, Access",
      "Cyber Insurance Agreement"
     ],
     "answer": 1,
     "explanation": "The CIA triad is a core security model: Confidentiality, Integrity, and Availability of information."
    },
    {
     "question": "What does multi-factor authentication (MFA) add to account security?",
     "choices": [
      "Nothing, it's just an extra step",
      "An additional verification step beyond just a password",
      "A way to skip password rules entirely",
      "A method to share passwords safely"
     ],
     "answer": 1,
     "explanation": "MFA requires an additional form of verification (like a code or biometric), making unauthorized access harder."
    },
    {
     "question": "What is phishing?",
     "choices": [
      "A type of firewall",
      "Tricking someone into revealing information or clicking a malicious link, often via email",
      "A method of encrypting data",
      "A hardware repair technique"
     ],
     "answer": 1,
     "explanation": "Phishing is a social engineering attack that tricks users into giving up credentials or clicking malicious links."
    },
    {
     "question": "Which organization publishes a widely used cybersecurity risk management framework?",
     "choices": [
      "NIST",
      "The Department of Motor Vehicles",
      "A random private blog",
      "None exist"
     ],
     "answer": 0,
     "explanation": "NIST (National Institute of Standards and Technology) publishes the widely adopted Cybersecurity Framework."
    },
    {
     "question": "What is a commonly recognized entry-level cybersecurity certification?",
     "choices": [
      "CompTIA Security+",
      "A culinary arts certificate",
      "A real estate license",
      "A CDL"
     ],
     "answer": 0,
     "explanation": "CompTIA Security+ is a well-known entry-level credential for cybersecurity careers."
    }
   ]
  },
  {
   "id": "welding",
   "title": "Welding",
   "icon": "🔥",
   "category": "Skilled Trades",
   "facts": [
    {
     "text": "Welders join metal parts together using heat, pressure, or both, often using processes like MIG, TIG, or stick welding.",
     "source": "https://www.bls.gov/ooh/production/welders-cutters-solderers-and-brazers.htm"
    },
    {
     "text": "Welding produces intense light and heat that can cause eye damage ('arc eye') and burns without proper PPE.",
     "source": "https://www.osha.gov/welding-cutting-brazing"
    },
    {
     "text": "Welding helmets with proper shade lenses, flame-resistant clothing, and gloves are essential safety equipment.",
     "source": "https://www.osha.gov/welding-cutting-brazing"
    },
    {
     "text": "Welders often train through vocational programs or registered apprenticeships that include hands-on practice.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/welder"
    },
    {
     "text": "Certification (e.g., through AWS - American Welding Society) can be required for certain structural or pipeline welding jobs.",
     "source": "https://www.bls.gov/ooh/production/welders-cutters-solderers-and-brazers.htm"
    },
    {
     "text": "The median annual wage for welders, cutters, solderers, and brazers was about $48,940 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/production/welders-cutters-solderers-and-brazers.htm"
    },
    {
     "text": "Employment for welders is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/production/welders-cutters-solderers-and-brazers.htm"
    },
    {
     "text": "Good ventilation is required when welding to avoid inhaling hazardous fumes produced by melting metal and coatings.",
     "source": "https://www.osha.gov/welding-cutting-brazing"
    }
   ],
   "mnemonic": "\"Shade your eyes, cover your skin\" — always wear a proper helmet and flame-resistant gear before striking an arc.",
   "quiz": [
    {
     "question": "Why must welders wear helmets with shaded lenses?",
     "choices": [
      "For fashion only",
      "To protect eyes from intense light that can cause damage like arc eye",
      "Helmets are not required",
      "To stay warm"
     ],
     "answer": 1,
     "explanation": "Welding arcs produce intense light that can injure unprotected eyes; shaded lenses prevent this damage."
    },
    {
     "question": "Why is ventilation important in a welding workspace?",
     "choices": [
      "It is not important",
      "To avoid inhaling hazardous fumes from melting metal and coatings",
      "To cool the metal faster",
      "To make the arc brighter"
     ],
     "answer": 1,
     "explanation": "Welding fumes can be hazardous to breathe, so proper ventilation protects worker health."
    },
    {
     "question": "What does a welder primarily do?",
     "choices": [
      "Join metal parts using heat and/or pressure",
      "Install plumbing fixtures",
      "Design buildings",
      "Repair computer networks"
     ],
     "answer": 0,
     "explanation": "Welders fuse metal components together using processes like MIG, TIG, or stick welding."
    },
    {
     "question": "What organization is commonly associated with welding certification in the U.S.?",
     "choices": [
      "American Welding Society (AWS)",
      "CompTIA",
      "NIST",
      "EPA"
     ],
     "answer": 0,
     "explanation": "The American Welding Society (AWS) is a well-known body offering welding certifications."
    },
    {
     "question": "What is a common pathway into a welding career?",
     "choices": [
      "Vocational training or a registered apprenticeship with hands-on practice",
      "No training required",
      "Only a 4-year engineering degree",
      "Online-only coursework with no practical component"
     ],
     "answer": 0,
     "explanation": "Vocational schools and apprenticeships provide the hands-on training welders need."
    }
   ]
  },
  {
   "id": "auto-mechanic",
   "title": "Auto Technician",
   "icon": "🚗",
   "category": "Skilled Trades",
   "facts": [
    {
     "text": "Automotive service technicians inspect, maintain, and repair cars and light trucks.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm"
    },
    {
     "text": "ASE (National Institute for Automotive Service Excellence) certification is a widely recognized credential for technicians.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm"
    },
    {
     "text": "Routine maintenance like oil changes, brake inspections, and tire rotations helps prevent bigger mechanical failures.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm"
    },
    {
     "text": "Technicians train through vocational/technical programs and on-the-job experience, sometimes via registered apprenticeships.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/automotive-service-technician"
    },
    {
     "text": "Modern vehicles rely heavily on onboard computers, so diagnostic scan tools are a standard part of troubleshooting.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm"
    },
    {
     "text": "The median annual wage for automotive service technicians and mechanics was about $47,770 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm"
    },
    {
     "text": "Employment for automotive technicians is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm"
    },
    {
     "text": "Always use proper jack stands (not just a jack) to support a vehicle before working underneath it.",
     "source": "https://www.osha.gov/vehicle-maintenance"
    }
   ],
   "mnemonic": "\"Jack it, then stand it\" — never trust a jack alone; always use jack stands before going underneath a car.",
   "quiz": [
    {
     "question": "What is ASE certification?",
     "choices": [
      "A driver's license category",
      "A widely recognized credential for automotive service technicians",
      "A plumbing license",
      "A cybersecurity certificate"
     ],
     "answer": 1,
     "explanation": "ASE (Automotive Service Excellence) certification validates a technician's skills in specific repair areas."
    },
    {
     "question": "Why should a mechanic use jack stands, not just a jack, before working under a car?",
     "choices": [
      "Jack stands are not necessary",
      "Jacks alone can fail or slip, so jack stands provide safer, stable support",
      "Jack stands make the car look better",
      "Jacks are illegal to use"
     ],
     "answer": 1,
     "explanation": "Jack stands provide a stable, locked support system, reducing the risk of a vehicle falling while someone is underneath."
    },
    {
     "question": "Why are diagnostic scan tools important for modern auto technicians?",
     "choices": [
      "Cars no longer need them",
      "Modern vehicles have onboard computers that scan tools help diagnose",
      "They are only used for oil changes",
      "They replace the need for any hands-on repair"
     ],
     "answer": 1,
     "explanation": "Modern vehicles rely on computer systems, and scan tools help technicians read codes and diagnose issues."
    },
    {
     "question": "Which of these is considered routine vehicle maintenance?",
     "choices": [
      "Oil changes and tire rotations",
      "Replacing the entire engine weekly",
      "Ignoring brake wear indefinitely",
      "Avoiding all inspections"
     ],
     "answer": 0,
     "explanation": "Oil changes, brake checks, and tire rotations are standard routine maintenance tasks."
    },
    {
     "question": "How do many automotive technicians typically train?",
     "choices": [
      "No training is needed",
      "Vocational/technical programs and hands-on experience, sometimes via apprenticeship",
      "Only by watching online videos with no practice",
      "Only through a law degree"
     ],
     "answer": 1,
     "explanation": "Technical school programs plus hands-on apprenticeship-style experience are common training paths."
    }
   ]
  },
  {
   "id": "cdl-driver",
   "title": "Commercial Driver (CDL)",
   "icon": "🚚",
   "category": "Transportation",
   "facts": [
    {
     "text": "Commercial drivers who operate large trucks or buses need a Commercial Driver's License (CDL), regulated federally and by states.",
     "source": "https://www.fmcsa.dot.gov/registration/commercial-drivers-license"
    },
    {
     "text": "The Federal Motor Carrier Safety Administration (FMCSA) sets national rules for CDL drivers, including hours-of-service limits.",
     "source": "https://www.fmcsa.dot.gov/regulations/hours-of-service"
    },
    {
     "text": "Hours-of-service rules limit how long a driver can drive before taking a required rest break, to reduce fatigue-related crashes.",
     "source": "https://www.fmcsa.dot.gov/regulations/hours-of-service"
    },
    {
     "text": "Pre-trip vehicle inspections are required to check brakes, tires, lights, and other safety systems before driving.",
     "source": "https://www.fmcsa.dot.gov/registration/commercial-drivers-license"
    },
    {
     "text": "CDL holders are subject to a lower legal BAC limit (0.04) than non-commercial drivers (0.08) when operating a commercial vehicle.",
     "source": "https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing"
    },
    {
     "text": "The median annual wage for heavy and tractor-trailer truck drivers was about $54,320 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/transportation-and-material-moving/heavy-and-tractor-trailer-truck-drivers.htm"
    },
    {
     "text": "Employment for heavy truck drivers is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/transportation-and-material-moving/heavy-and-tractor-trailer-truck-drivers.htm"
    },
    {
     "text": "CDL training programs combine classroom instruction with supervised behind-the-wheel driving practice.",
     "source": "https://www.fmcsa.dot.gov/registration/commercial-drivers-license"
    }
   ],
   "mnemonic": "\"Half the limit, double the caution\" — CDL drivers' BAC limit (0.04) is half the standard 0.08, reflecting extra responsibility.",
   "quiz": [
    {
     "question": "What federal agency regulates CDL drivers and hours-of-service rules?",
     "choices": [
      "FMCSA (Federal Motor Carrier Safety Administration)",
      "EPA",
      "NIST",
      "CompTIA"
     ],
     "answer": 0,
     "explanation": "FMCSA sets national safety rules for commercial drivers, including hours-of-service limits."
    },
    {
     "question": "What is the legal BAC limit for a CDL holder operating a commercial vehicle?",
     "choices": [
      "0.08",
      "0.04",
      "0.10",
      "There is no limit"
     ],
     "answer": 1,
     "explanation": "Commercial drivers face a stricter 0.04 BAC limit compared to the standard 0.08 for non-commercial drivers."
    },
    {
     "question": "Why are hours-of-service rules important for truck drivers?",
     "choices": [
      "They have no real safety purpose",
      "They limit driving time to reduce fatigue-related crashes",
      "They only apply to weekends",
      "They increase pay, nothing else"
     ],
     "answer": 1,
     "explanation": "Limiting consecutive driving hours helps prevent drowsy-driving crashes among commercial drivers."
    },
    {
     "question": "What should a commercial driver do before starting a trip?",
     "choices": [
      "Skip any inspection to save time",
      "Perform a pre-trip inspection of brakes, tires, lights, and other safety systems",
      "Only check the radio works",
      "Inspect the vehicle only once a year"
     ],
     "answer": 1,
     "explanation": "Pre-trip inspections help catch mechanical problems before they become safety hazards on the road."
    },
    {
     "question": "How do most people train to get a CDL?",
     "choices": [
      "No training is required",
      "Programs combining classroom instruction with supervised behind-the-wheel practice",
      "Only reading a pamphlet",
      "Only online with no driving practice"
     ],
     "answer": 1,
     "explanation": "CDL training programs typically combine classroom learning with hands-on supervised driving."
    }
   ]
  },
  {
   "id": "nursing-assistant",
   "title": "Nursing Assistant (CNA)",
   "icon": "🩺",
   "category": "Healthcare",
   "facts": [
    {
     "text": "Nursing assistants (CNAs) help patients with daily activities like bathing, dressing, eating, and mobility under supervision of nurses.",
     "source": "https://www.bls.gov/ooh/healthcare/nursing-assistants-and-orderlies.htm"
    },
    {
     "text": "Hand hygiene (proper handwashing or sanitizing) is one of the most important ways to prevent spreading infections in healthcare settings.",
     "source": "https://www.cdc.gov/handhygiene/providers/index.html"
    },
    {
     "text": "CNAs typically complete a state-approved training program and pass a competency exam to become certified.",
     "source": "https://www.bls.gov/ooh/healthcare/nursing-assistants-and-orderlies.htm"
    },
    {
     "text": "Vital signs — temperature, pulse, respiration, and blood pressure — are basic measurements CNAs are trained to monitor.",
     "source": "https://www.bls.gov/ooh/healthcare/nursing-assistants-and-orderlies.htm"
    },
    {
     "text": "CNA certification requirements vary by state; DC, Maryland, and Virginia each maintain their own nurse aide registries.",
     "source": "https://www.bls.gov/ooh/healthcare/nursing-assistants-and-orderlies.htm"
    },
    {
     "text": "Pay varies widely by employer and region. Check the BLS Occupational Outlook Handbook for the latest national median pay.",
     "source": "https://www.bls.gov/ooh/healthcare/nursing-assistants-and-orderlies.htm"
    },
    {
     "text": "Employment for nursing assistants is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/healthcare/nursing-assistants-and-orderlies.htm"
    },
    {
     "text": "Proper body mechanics (like bending knees, not the back) help prevent injury when lifting or repositioning patients.",
     "source": "https://www.osha.gov/healthcare"
    }
   ],
   "mnemonic": "\"Wash, watch vitals, lift with your legs\" — the CNA basics for safe, clean patient care.",
   "quiz": [
    {
     "question": "Why is hand hygiene so critical in healthcare settings?",
     "choices": [
      "It has no real effect on infection spread",
      "It is one of the most effective ways to prevent spreading infections",
      "It is only for appearance",
      "It is required only once per shift"
     ],
     "answer": 1,
     "explanation": "Proper hand hygiene significantly reduces the spread of infections between patients and staff."
    },
    {
     "question": "What are the four basic vital signs CNAs commonly monitor?",
     "choices": [
      "Height, weight, age, and eye color",
      "Temperature, pulse, respiration, and blood pressure",
      "Name, address, phone number, and insurance",
      "Shoe size, hair color, grip strength, and mood"
     ],
     "answer": 1,
     "explanation": "Temperature, pulse, respiration, and blood pressure are the standard vital signs monitored in patient care."
    },
    {
     "question": "How do people typically become a Certified Nursing Assistant (CNA)?",
     "choices": [
      "No training is required",
      "Complete a state-approved training program and pass a competency exam",
      "Only a high school diploma, nothing else",
      "A 4-year nursing degree is required first"
     ],
     "answer": 1,
     "explanation": "CNA certification requires completing an approved training program and passing a state competency exam."
    },
    {
     "question": "What is the safe way to lift or reposition a patient?",
     "choices": [
      "Bend at the back, not the knees",
      "Use proper body mechanics: bend at the knees, keep back straight",
      "Lift as quickly as possible regardless of form",
      "Avoid ever assisting patients"
     ],
     "answer": 1,
     "explanation": "Bending at the knees and keeping the back straight reduces the risk of back injury when lifting patients."
    },
    {
     "question": "Does CNA certification work the same way in every state?",
     "choices": [
      "Yes, identical everywhere",
      "No — requirements vary by state, including in DC, Maryland, and Virginia",
      "Only federal rules apply, no state variation",
      "CNA certification doesn't exist"
     ],
     "answer": 1,
     "explanation": "Each state maintains its own nurse aide registry and certification requirements."
    }
   ]
  },
  {
   "id": "culinary",
   "title": "Culinary Arts",
   "icon": "🍳",
   "category": "Hospitality",
   "facts": [
    {
     "text": "Cooks and chefs prepare, season, and cook food in restaurants and other food-service settings.",
     "source": "https://www.bls.gov/ooh/food-preparation-and-serving/chefs-and-head-cooks.htm"
    },
    {
     "text": "Cook poultry to an internal temperature of 165°F, and check it with a food thermometer, not by color.",
     "source": "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures"
    },
    {
     "text": "Keeping raw meat separate from ready-to-eat food (separate cutting boards/utensils) helps prevent cross-contamination.",
     "source": "https://www.fda.gov/food/retail-food-protection/fda-food-code"
    },
    {
     "text": "USDA food-safety guidance calls 40°F–140°F the 'Danger Zone,' where bacteria grow fastest. Don't leave food out in that range for more than 2 hours.",
     "source": "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f"
    },
    {
     "text": "Culinary training ranges from on-the-job kitchen experience to culinary school programs and apprenticeships.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/cook"
    },
    {
     "text": "The median annual wage for chefs and head cooks was about $58,920 in May 2023, per BLS data.",
     "source": "https://www.bls.gov/ooh/food-preparation-and-serving/chefs-and-head-cooks.htm"
    },
    {
     "text": "Employment for chefs and head cooks is projected to grow faster than average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/food-preparation-and-serving/chefs-and-head-cooks.htm"
    },
    {
     "text": "Food handler cards/certifications are often required by local health departments before working with food.",
     "source": "https://www.fda.gov/food/retail-food-protection/fda-food-code"
    }
   ],
   "mnemonic": "\"165 kills, 40-140 chills your worries\" — cook poultry to 165°F, and don't leave food sitting in the 40-140°F danger zone too long.",
   "quiz": [
    {
     "question": "To what internal temperature should poultry be cooked to kill harmful bacteria?",
     "choices": [
      "120°F",
      "145°F",
      "165°F",
      "200°F"
     ],
     "answer": 2,
     "explanation": "The FDA Food Code recommends cooking poultry to an internal temperature of at least 165°F."
    },
    {
     "question": "What is the food 'danger zone' temperature range where bacteria grow quickly?",
     "choices": [
      "0°F to 32°F",
      "40°F to 140°F",
      "200°F to 300°F",
      "There is no danger zone"
     ],
     "answer": 1,
     "explanation": "Bacteria multiply rapidly in food held between 40°F and 140°F, so food shouldn't sit in that range too long."
    },
    {
     "question": "Why should raw meat and ready-to-eat food use separate cutting boards?",
     "choices": [
      "It doesn't matter, one board is fine",
      "To prevent cross-contamination from raw meat bacteria to other food",
      "To save time",
      "Separate boards are only for appearance"
     ],
     "answer": 1,
     "explanation": "Using separate boards/utensils prevents bacteria from raw meat from contaminating other foods."
    },
    {
     "question": "What is often required by local health departments before someone can work with food?",
     "choices": [
      "Nothing at all",
      "A food handler card/certification",
      "A commercial driver's license",
      "A cybersecurity certificate"
     ],
     "answer": 1,
     "explanation": "Many jurisdictions require a food handler certification to ensure basic food safety knowledge."
    },
    {
     "question": "What is a common pathway into a culinary career?",
     "choices": [
      "On-the-job kitchen experience, culinary school, or apprenticeship",
      "No training is ever involved",
      "Only a 4-year engineering degree",
      "Only working in IT first"
     ],
     "answer": 0,
     "explanation": "Culinary careers can start through hands-on kitchen work, culinary school, or structured apprenticeships."
    }
   ]
  },
  {
   "id": "cosmetology-barbering",
   "title": "Barbering & Cosmetology",
   "icon": "💈",
   "category": "Personal Care",
   "facts": [
    {
     "text": "Cosmetologists and barbers cut, style, and treat hair, and may also provide services like shaving, skin care, or nail care.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    },
    {
     "text": "Cosmetologists and barbers must be licensed in nearly every U.S. state, typically requiring completion of a state-approved program and passing an exam.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    },
    {
     "text": "Proper sanitation of tools (like combs, clippers, and razors) between clients is essential to prevent spreading infections.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    },
    {
     "text": "Training is typically completed at a licensed cosmetology or barber school, often followed by a state licensing exam.",
     "source": "https://www.apprenticeship.gov/apprenticeship-job-finder/explore-careers/barber"
    },
    {
     "text": "DC, Maryland, and Virginia each maintain their own cosmetology/barbering licensing boards with specific hour and exam requirements.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    },
    {
     "text": "Pay varies widely by employer and region. Check the BLS Occupational Outlook Handbook for the latest national median pay.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    },
    {
     "text": "Employment in this field is projected to grow about as fast as average, per BLS outlook data.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    },
    {
     "text": "Chemical services (like hair coloring or relaxing) require careful attention to product instructions to avoid skin or scalp injury.",
     "source": "https://www.bls.gov/ooh/personal-care-and-service/barbers-hairstylists-and-cosmetologists.htm"
    }
   ],
   "mnemonic": "\"Clean tools, licensed hands\" — sanitation and state licensing are the two pillars of this trade.",
   "quiz": [
    {
     "question": "Why must tools like clippers and combs be sanitized between clients?",
     "choices": [
      "It doesn't matter if they're clean",
      "To prevent spreading infections between clients",
      "Only for appearance",
      "Sanitizing is optional in this trade"
     ],
     "answer": 1,
     "explanation": "Proper tool sanitation prevents the spread of bacteria, fungi, and other infections between clients."
    },
    {
     "question": "What is generally required to legally work as a cosmetologist or barber in the U.S.?",
     "choices": [
      "No license is needed anywhere",
      "Completing a state-approved program and obtaining a state license",
      "Only a high school diploma, no further training",
      "A college degree in an unrelated field"
     ],
     "answer": 1,
     "explanation": "Nearly all states require completion of an approved training program plus passing a licensing exam."
    },
    {
     "question": "Do licensing requirements for cosmetology/barbering vary between DC, Maryland, and Virginia?",
     "choices": [
      "No, they are identical",
      "Yes, each jurisdiction sets its own hour and exam requirements",
      "Licensing doesn't exist in this field",
      "Only DC requires licensing"
     ],
     "answer": 1,
     "explanation": "Each state/jurisdiction maintains its own licensing board with specific requirements."
    },
    {
     "question": "Why is care important when performing chemical services like hair coloring?",
     "choices": [
      "Chemicals are always perfectly safe with no risk",
      "Improper use can cause skin or scalp injury, so following instructions matters",
      "Chemical services require no special attention",
      "Only shampoo needs careful handling"
     ],
     "answer": 1,
     "explanation": "Chemical hair treatments can cause burns or irritation if not used according to proper procedures."
    },
    {
     "question": "Besides hair cutting and styling, what other services might cosmetologists or barbers provide?",
     "choices": [
      "Only haircuts, nothing else ever",
      "Services like shaving, skin care, or nail care",
      "Only legal consulting",
      "Vehicle repair"
     ],
     "answer": 1,
     "explanation": "Depending on licensing and specialty, these professionals may offer additional services like shaving or nail care."
    }
   ]
  }
 ],
 "permitQuestions": [
  {
   "id": "dc-1",
   "jurisdiction": "DC",
   "topic": "Cell phone law",
   "question": "Under DC law, which of the following is prohibited while driving (except hands-free use)?",
   "choices": [
    "Holding and using a cell phone to talk or text",
    "Listening to the radio",
    "Using a GPS mounted on the dashboard",
    "Talking to a passenger"
   ],
   "answer": 0,
   "explanation": "DC prohibits drivers from holding a handheld phone to talk or text while driving; hands-free devices are allowed.",
   "source": "https://dmv.dc.gov/page/driving-and-cell-phones",
   "general": false
  },
  {
   "id": "dc-2",
   "jurisdiction": "DC",
   "topic": "BAC limit - adult",
   "question": "What is the legal blood alcohol concentration (BAC) limit for drivers 21 and older in DC?",
   "choices": [
    ".05",
    ".08",
    ".10",
    ".02"
   ],
   "answer": 1,
   "explanation": "DC's legal BAC limit for drivers 21+ is .08, consistent with national standards.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-3",
   "jurisdiction": "DC",
   "topic": "Zero tolerance",
   "question": "DC's 'zero tolerance' law for drivers under 21 means a driver can be penalized with a BAC as low as:",
   "choices": [
    ".08",
    ".10",
    "Any detectable amount/very low threshold (e.g., .02)",
    "There is no special rule for under-21 drivers"
   ],
   "answer": 2,
   "explanation": "Zero tolerance laws set a much lower BAC threshold for drivers under 21 than the standard .08 adult limit.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-4",
   "jurisdiction": "DC",
   "topic": "Seat belts",
   "question": "In DC, who is required to wear a seat belt in a moving vehicle?",
   "choices": [
    "Only the driver",
    "Only front-seat passengers",
    "Driver and all passengers, per DC's seat belt law",
    "Only passengers under 16"
   ],
   "answer": 2,
   "explanation": "DC law requires the driver and all passengers to wear seat belts.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-5",
   "jurisdiction": "DC",
   "topic": "School zones",
   "question": "When children are present, what should drivers do in a posted school zone?",
   "choices": [
    "Maintain normal speed",
    "Reduce speed to the posted school zone limit and watch for children",
    "Only slow down if a crossing guard is visible",
    "Speed up to clear the area quickly"
   ],
   "answer": 1,
   "explanation": "DC school zones have reduced posted speed limits in effect during school hours/when children are present.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-6",
   "jurisdiction": "DC",
   "topic": "Pedestrians/crosswalks",
   "question": "When a pedestrian is crossing in a marked or unmarked crosswalk, a DC driver must:",
   "choices": [
    "Honk to clear the way",
    "Yield/stop for the pedestrian",
    "Only yield if the pedestrian is elderly or a child",
    "Proceed if the driver has a green light, regardless of pedestrians"
   ],
   "answer": 1,
   "explanation": "Drivers in DC must yield to pedestrians who are in a crosswalk, marked or unmarked.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-7",
   "jurisdiction": "DC",
   "topic": "Automated enforcement",
   "question": "DC uses automated traffic enforcement cameras primarily to detect which violations?",
   "choices": [
    "Expired registration only",
    "Speeding and red-light violations",
    "Parking meter expiration",
    "Seat belt violations"
   ],
   "answer": 1,
   "explanation": "DC operates speed cameras and red-light cameras as part of its automated traffic enforcement program.",
   "source": "https://dmv.dc.gov/page/automated-traffic-enforcement",
   "general": false
  },
  {
   "id": "dc-8",
   "jurisdiction": "DC",
   "topic": "Right turn on red",
   "question": "In DC, a driver may turn right on a red light:",
   "choices": [
    "Always, without stopping",
    "After coming to a complete stop, unless a sign prohibits it",
    "Only between 9am-5pm",
    "Never, under any circumstance"
   ],
   "answer": 1,
   "explanation": "Right turn on red is generally allowed in DC after a full stop, except where signage specifically prohibits it (common in DC for pedestrian safety).",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-9",
   "jurisdiction": "DC",
   "topic": "Permit basics",
   "question": "Before taking the DC road skills test, an applicant must first:",
   "choices": [
    "Pass the knowledge (written) test and obtain a learner permit",
    "Buy their own car",
    "Complete a 4-year degree",
    "Take only a vision test"
   ],
   "answer": 0,
   "explanation": "Applicants must pass the knowledge test and hold a learner permit with required practice before taking the road test.",
   "source": "https://dmv.dc.gov/page/driver-licensing",
   "general": false
  },
  {
   "id": "dc-10",
   "jurisdiction": "DC",
   "topic": "Following distance",
   "question": "What is a commonly recommended minimum following distance in normal conditions?",
   "choices": [
    "1 second",
    "3 seconds",
    "10 seconds",
    "No specific guideline is ever given"
   ],
   "answer": 1,
   "explanation": "A 3-second following distance is a widely taught minimum safety buffer in normal conditions, increasing in poor weather.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-11",
   "jurisdiction": "DC",
   "topic": "Work zones",
   "question": "In a DC work zone, drivers should:",
   "choices": [
    "Ignore flaggers and follow signals only",
    "Slow down, follow posted signs, and obey flaggers",
    "Speed up to pass through quickly",
    "Use the shoulder to bypass traffic"
   ],
   "answer": 1,
   "explanation": "Work zones require reduced speed and close attention to flaggers and temporary signage.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-12",
   "jurisdiction": "DC",
   "topic": "Move over/emergency vehicles",
   "question": "When an emergency vehicle approaches with lights/siren active, a driver should:",
   "choices": [
    "Stop immediately in the lane",
    "Pull to the right edge of the roadway and stop, then proceed when clear",
    "Speed up to get out of the way",
    "Ignore it unless it is directly behind"
   ],
   "answer": 1,
   "explanation": "Drivers must yield right-of-way to emergency vehicles by pulling to the right and stopping until it passes.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-13",
   "jurisdiction": "DC",
   "topic": "Traffic signals",
   "question": "A steady yellow traffic light means:",
   "choices": [
    "Speed up to beat the red",
    "The signal is about to change to red; prepare to stop if safe to do so",
    "Stop is optional",
    "It functions the same as a green light"
   ],
   "answer": 1,
   "explanation": "Yellow means the signal is about to turn red; drivers should stop if they can do so safely.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-15",
   "jurisdiction": "DC",
   "topic": "Signaling",
   "question": "Before changing lanes or turning, a driver must:",
   "choices": [
    "Signal early, well before the turn or lane change",
    "Only signal if other cars are visible",
    "Signal only when turning left",
    "No signal is required in light traffic"
   ],
   "answer": 0,
   "explanation": "Drivers are required to signal their intent to turn or change lanes well before executing the maneuver.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-16",
   "jurisdiction": "DC",
   "topic": "Distracted driving",
   "question": "Besides phone use, which of these is also a form of distracted driving to avoid?",
   "choices": [
    "Adjusting mirrors before starting to drive",
    "Eating, grooming, or reaching for objects while driving",
    "Checking mirrors periodically",
    "Signaling before a turn"
   ],
   "answer": 1,
   "explanation": "Any activity that takes attention, hands, or eyes off driving (eating, grooming, reaching) is considered distracted driving.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-17",
   "jurisdiction": "DC",
   "topic": "Right-of-way",
   "question": "At a four-way stop where two cars arrive at the same time, who has the right-of-way?",
   "choices": [
    "The car on the right",
    "The car on the left",
    "The larger vehicle",
    "Whoever honks first"
   ],
   "answer": 0,
   "explanation": "At a four-way stop, when vehicles arrive simultaneously, the vehicle to the right generally has the right-of-way.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-18",
   "jurisdiction": "DC",
   "topic": "Alcohol/drug impairment",
   "question": "In DC, refusing a chemical (breath/blood) test when lawfully arrested for suspected DUI can result in:",
   "choices": [
    "No consequence at all",
    "Automatic license suspension under implied consent rules",
    "A small fine only, no license action",
    "Only a warning"
   ],
   "answer": 1,
   "explanation": "Implied consent laws mean refusing a chemical test can trigger administrative license suspension, separate from any DUI charge.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": false
  },
  {
   "id": "dc-19",
   "jurisdiction": "DC",
   "topic": "Roundabouts",
   "question": "When entering a roundabout in DC, a driver should:",
   "choices": [
    "Yield to traffic already circulating in the roundabout",
    "Always stop completely, even if clear",
    "Speed up to merge ahead of circulating traffic",
    "Enter from the left side only"
   ],
   "answer": 0,
   "explanation": "Entering traffic must yield to vehicles already circulating in the roundabout.",
   "source": "https://dmv.dc.gov/page/dc-driver-manual",
   "general": true
  },
  {
   "id": "dc-20",
   "jurisdiction": "DC",
   "topic": "Permit supervision",
   "question": "A DC learner permit holder practicing on public roads generally must:",
   "choices": [
    "Drive alone immediately after getting the permit",
    "Be accompanied by a licensed, qualified supervising driver as required by DC rules",
    "Only practice in a parking lot forever",
    "Have a second learner permit holder supervise them"
   ],
   "answer": 1,
   "explanation": "Learner permit holders must practice with a licensed supervising driver per DC licensing rules before taking the road test.",
   "source": "https://dmv.dc.gov/page/driver-licensing",
   "general": false
  },
  {
   "id": "md-1",
   "jurisdiction": "MD",
   "topic": "Move Over law",
   "question": "Maryland's 'Move Over' law requires drivers approaching a stopped emergency, tow, or highway maintenance vehicle with lights activated to:",
   "choices": [
    "Ignore it if in a different lane",
    "Move over a lane if possible, or slow down if they cannot move over",
    "Stop completely on the highway",
    "Flash their headlights and continue at normal speed"
   ],
   "answer": 1,
   "explanation": "Maryland's Move Over law requires drivers to change lanes away from the stopped vehicle when safe, or reduce speed if a lane change isn't possible.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "md-2",
   "jurisdiction": "MD",
   "topic": "Learner's permit supervision",
   "question": "A Maryland learner's permit holder must be accompanied by:",
   "choices": [
    "No one; they may drive alone",
    "A licensed driver at least 21 years old (or qualifying supervisor) seated beside them",
    "Any passenger, regardless of age or license status",
    "A police escort vehicle"
   ],
   "answer": 1,
   "explanation": "Maryland requires learner's permit holders to be supervised by a qualified licensed driver, typically at least 21, seated in the front passenger seat.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "md-3",
   "jurisdiction": "MD",
   "topic": "Provisional license",
   "question": "In Maryland's graduated licensing system, after the learner's permit stage, a young driver typically moves to:",
   "choices": [
    "A full unrestricted license immediately",
    "A provisional license with certain restrictions before full licensure",
    "A commercial license",
    "No intermediate stage exists"
   ],
   "answer": 1,
   "explanation": "Maryland uses a graduated driver licensing system: learner's permit, then provisional license with restrictions, then full license.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "md-4",
   "jurisdiction": "MD",
   "topic": "Supervised driving hours",
   "question": "Maryland's graduated licensing program requires learner's permit holders to log:",
   "choices": [
    "No practice hours are required",
    "A state-specified minimum number of supervised practice driving hours before advancing",
    "Only daytime driving, no logging required",
    "Hours only if under age 16"
   ],
   "answer": 1,
   "explanation": "Maryland requires learner permit holders to complete a minimum number of logged supervised driving hours, including some nighttime hours, before advancing stages.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "md-5",
   "jurisdiction": "MD",
   "topic": "Seat belts",
   "question": "Maryland law regarding seat belts requires:",
   "choices": [
    "Only the driver must wear one",
    "Driver and passengers are required to wear seat belts as specified by law",
    "Seat belts are optional on local roads",
    "Only required on highways"
   ],
   "answer": 1,
   "explanation": "Maryland law requires seat belt use for the driver and passengers per state seat belt statutes.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "md-6",
   "jurisdiction": "MD",
   "topic": "BAC limit",
   "question": "The legal BAC limit for drivers 21 and older in Maryland is:",
   "choices": [
    ".05",
    ".08",
    ".10",
    ".12"
   ],
   "answer": 1,
   "explanation": "Maryland's legal limit for drivers 21+ is .08 BAC, consistent with national standards.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "md-7",
   "jurisdiction": "MD",
   "topic": "Work zones",
   "question": "Fines for traffic violations in a Maryland work zone compared to normal roads are typically:",
   "choices": [
    "Lower",
    "The same",
    "Higher/doubled in many cases",
    "Not enforced in work zones"
   ],
   "answer": 2,
   "explanation": "Maryland, like many states, increases penalties for violations committed in active work zones to improve worker safety.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": true
  },
  {
   "id": "md-9",
   "jurisdiction": "MD",
   "topic": "Right of way",
   "question": "When two vehicles arrive at a four-way stop at the same time in Maryland, right-of-way generally goes to:",
   "choices": [
    "The vehicle on the right",
    "The vehicle on the left",
    "Whichever vehicle is larger",
    "Whoever arrived from the north"
   ],
   "answer": 0,
   "explanation": "Standard right-of-way rules give priority to the vehicle on the right when arrival is simultaneous.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": true
  },
  {
   "id": "md-10",
   "jurisdiction": "MD",
   "topic": "Distracted driving",
   "question": "Maryland law restricts handheld cell phone use while driving in order to:",
   "choices": [
    "Encourage drivers to use hands-free technology and reduce distraction",
    "Ban all phone use including hands-free in vehicles",
    "Only apply to drivers under 18",
    "Apply only to commercial truck drivers"
   ],
   "answer": 0,
   "explanation": "Maryland restricts handheld phone use while driving, encouraging hands-free alternatives to reduce distracted driving.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": true
  },
  {
   "id": "md-11",
   "jurisdiction": "MD",
   "topic": "School buses",
   "question": "When a Maryland school bus has its red lights flashing and stop arm extended, drivers in both directions (on undivided roads) must:",
   "choices": [
    "Pass carefully at reduced speed",
    "Stop until the lights stop flashing and the bus moves or signals it's clear",
    "Only stop if a child is visible",
    "Only stop if driving behind the bus"
   ],
   "answer": 1,
   "explanation": "Traffic in both directions on an undivided road must stop for a school bus with flashing red lights and extended stop arm.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": true
  },
  {
   "id": "md-12",
   "jurisdiction": "MD",
   "topic": "Alcohol - implied consent",
   "question": "Maryland's implied consent law means that by driving on Maryland roads, a driver has agreed to:",
   "choices": [
    "Submit to chemical testing if lawfully arrested for suspected impaired driving",
    "Pay for all repairs after any accident",
    "Never be tested for alcohol",
    "Automatically lose their license after one ticket"
   ],
   "answer": 0,
   "explanation": "Implied consent laws mean driving on public roads implies agreement to chemical testing when lawfully arrested for suspected DUI/DWI.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx",
   "general": false
  },
  {
   "id": "va-2",
   "jurisdiction": "VA",
   "topic": "Hands-free law",
   "question": "Virginia's hands-free driving law, effective 2021, generally prohibits drivers from:",
   "choices": [
    "Holding a phone while driving to text, talk, or browse",
    "Using voice-activated hands-free systems",
    "Listening to music through a phone connected via Bluetooth",
    "Using a GPS app mounted on the dashboard"
   ],
   "answer": 0,
   "explanation": "Virginia's 2021 hands-free law bars drivers from holding a handheld personal communications device while operating a vehicle.",
   "source": "https://www.dmv.virginia.gov/newsroom/hands-free-law",
   "general": false
  },
  {
   "id": "va-3",
   "jurisdiction": "VA",
   "topic": "Learner's permit age",
   "question": "In Virginia, the minimum age to apply for a learner's permit is generally:",
   "choices": [
    "13",
    "15 (commonly cited as 15 years and 6 months for the classroom/driving sequence)",
    "18",
    "21"
   ],
   "answer": 1,
   "explanation": "Virginia allows teens to begin the learner's permit process around age 15½ as part of its graduated licensing system.",
   "source": "https://www.dmv.virginia.gov/drivers/learners-permit",
   "general": false
  },
  {
   "id": "va-4",
   "jurisdiction": "VA",
   "topic": "Supervised driving time",
   "question": "Virginia's graduated licensing program requires young learner's permit holders to complete a state-specified amount of:",
   "choices": [
    "No supervised driving at all",
    "Supervised behind-the-wheel practice hours, including nighttime hours, before a license",
    "Only classroom instruction, no driving practice",
    "One supervised hour total"
   ],
   "answer": 1,
   "explanation": "Virginia requires a minimum number of supervised driving hours, including nighttime hours, logged before a young driver can obtain a license.",
   "source": "https://www.dmv.virginia.gov/drivers/learners-permit",
   "general": false
  },
  {
   "id": "va-5",
   "jurisdiction": "VA",
   "topic": "BAC limit",
   "question": "Virginia's legal BAC limit for drivers 21 and older is:",
   "choices": [
    ".05",
    ".08",
    ".10",
    ".12"
   ],
   "answer": 1,
   "explanation": "Virginia's legal limit for drivers 21+ is .08, matching the national standard.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": false
  },
  {
   "id": "va-6",
   "jurisdiction": "VA",
   "topic": "Zero tolerance",
   "question": "Virginia's zero-tolerance law for drivers under 21 sets the illegal BAC threshold at:",
   "choices": [
    ".08",
    "A much lower level (e.g., .02), far below the adult limit",
    "Same as the adult limit",
    "There is no special rule"
   ],
   "answer": 1,
   "explanation": "Zero-tolerance laws for underage drivers set a much lower BAC threshold than the standard adult limit.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": false
  },
  {
   "id": "va-7",
   "jurisdiction": "VA",
   "topic": "Seat belts",
   "question": "Virginia law on seat belts requires:",
   "choices": [
    "Only the driver to buckle up",
    "All occupants, including rear-seat passengers, to wear a seat belt as specified by law",
    "No requirement for adults",
    "Only children under 8"
   ],
   "answer": 1,
   "explanation": "Virginia law requires seat belt use for drivers and passengers, with specific child safety seat rules for younger children.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": false
  },
  {
   "id": "va-8",
   "jurisdiction": "VA",
   "topic": "Move Over law",
   "question": "Virginia's Move Over law requires drivers approaching a stopped law-enforcement, emergency, or highway worker vehicle with activated lights to:",
   "choices": [
    "Flash headlights and keep the same speed",
    "Move to a non-adjacent lane if possible, or slow down if they cannot change lanes",
    "Stop in place on the highway",
    "Pass as quickly as possible"
   ],
   "answer": 1,
   "explanation": "Move Over laws require drivers to change lanes away from the stopped vehicle when safe, or reduce speed when a lane change isn't possible.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": false
  },
  {
   "id": "va-9",
   "jurisdiction": "VA",
   "topic": "School buses",
   "question": "When a Virginia school bus stops with red lights flashing and stop arm extended on a two-lane road, traffic in both directions must:",
   "choices": [
    "Pass slowly",
    "Stop until the bus resumes motion or signals it is safe",
    "Only stop if behind the bus",
    "Honk and proceed"
   ],
   "answer": 1,
   "explanation": "On undivided roads, Virginia law requires traffic from both directions to stop for a school bus with activated red lights/stop arm.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": true
  },
  {
   "id": "va-10",
   "jurisdiction": "VA",
   "topic": "Right of way",
   "question": "At an uncontrolled intersection in Virginia, if two vehicles arrive at the same time, the right-of-way generally goes to:",
   "choices": [
    "The vehicle on the right",
    "The vehicle on the left",
    "The faster vehicle",
    "The vehicle honking first"
   ],
   "answer": 0,
   "explanation": "Standard right-of-way convention gives priority to the vehicle approaching from the right at uncontrolled intersections.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": true
  },
  {
   "id": "va-11",
   "jurisdiction": "VA",
   "topic": "Work zones",
   "question": "Virginia law treats traffic violations committed in highway work zones as:",
   "choices": [
    "Less serious than elsewhere",
    "Often subject to increased fines/penalties to protect workers",
    "Not enforced at all",
    "Only enforced on weekends"
   ],
   "answer": 1,
   "explanation": "Virginia increases penalties for certain violations in active work zones to protect highway workers.",
   "source": "https://www.dmv.virginia.gov/drivers/driver-manual",
   "general": true
  },
  {
   "id": "gen-1",
   "jurisdiction": "DC",
   "topic": "Signs",
   "question": "An eight-sided (octagon) red sign always means:",
   "choices": [
    "Yield",
    "Stop completely",
    "Railroad crossing ahead",
    "School zone"
   ],
   "answer": 1,
   "explanation": "The octagon shape is used only for STOP signs. Come to a full stop at the line, crosswalk, or intersection edge.",
   "source": "https://mutcd.fhwa.dot.gov/htm/2009/part2/part2b.htm",
   "general": true
  },
  {
   "id": "gen-2",
   "jurisdiction": "MD",
   "topic": "Signs",
   "question": "A downward-pointing triangle sign with a red border means:",
   "choices": [
    "Stop",
    "Yield: slow down and give the right-of-way",
    "No passing zone",
    "One way"
   ],
   "answer": 1,
   "explanation": "YIELD signs are the only downward-pointing triangles. Slow down, and stop if needed, to let crossing traffic and pedestrians go first.",
   "source": "https://mutcd.fhwa.dot.gov/htm/2009/part2/part2b.htm",
   "general": true
  },
  {
   "id": "gen-3",
   "jurisdiction": "VA",
   "topic": "Signs",
   "question": "Yellow diamond-shaped signs are generally used for:",
   "choices": [
    "Warnings about conditions ahead",
    "Speed limits",
    "Route numbers",
    "Parking rules"
   ],
   "answer": 0,
   "explanation": "Diamond-shaped yellow signs warn of hazards or changes ahead, such as curves, merges, or signals.",
   "source": "https://mutcd.fhwa.dot.gov/htm/2009/part2/part2c.htm",
   "general": true
  },
  {
   "id": "gen-4",
   "jurisdiction": "VA",
   "topic": "Signals",
   "question": "A flashing red traffic light means you must:",
   "choices": [
    "Slow down and continue",
    "Stop completely, then go when safe, like a stop sign",
    "Speed up to clear the intersection",
    "Treat it as a green light"
   ],
   "answer": 1,
   "explanation": "A flashing red signal works like a STOP sign: stop completely, then go only when it is safe.",
   "source": "https://mutcd.fhwa.dot.gov/htm/2009/part4/part4d.htm",
   "general": true
  },
  {
   "id": "gen-5",
   "jurisdiction": "MD",
   "topic": "Signs",
   "question": "A round yellow sign with a black X and two R letters warns of:",
   "choices": [
    "A railroad crossing ahead",
    "A roundabout",
    "A rest area",
    "Road repair"
   ],
   "answer": 0,
   "explanation": "The round yellow advance warning sign means a railroad crossing is ahead. Look and listen for trains, and be prepared to stop.",
   "source": "https://mutcd.fhwa.dot.gov/htm/2009/part8/part8b.htm",
   "general": true
  }
 ],
 "testFormats": {
  "DC": {
   "summary": "The DC DMV knowledge test is multiple choice on traffic laws, signs and safe driving. Check the DC DMV for the current number of questions and the pass score.",
   "source": "https://dmv.dc.gov/service/knowledge-test"
  },
  "MD": {
   "summary": "The Maryland MVA knowledge test is multiple choice on Maryland traffic laws, signs and safe driving, and is required for a learner’s permit. Confirm the current format with the MVA.",
   "source": "https://mva.maryland.gov/drivers/Pages/driver-manual.aspx"
  },
  "VA": {
   "summary": "The Virginia DMV knowledge exam covers traffic signs and general driving knowledge, and is based on the Virginia Driver’s Manual. Confirm the current sections and pass rules with the DMV.",
   "source": "https://www.dmv.virginia.gov/licenses-ids/license/applying/exams"
  }
 }
};

if (typeof module !== 'undefined') module.exports = LearningData;
