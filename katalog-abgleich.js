// MW4-Ausrüstung und Apex-Namen: Activision, Spielstart und Saison 1, DE / EN.
// https://www.callofduty.com/de/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class
// Saison-1-Patch: https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes
// Aufsatz-Namen nach Katalog-ID: https://warzoneloadout.games/de/mw4/attachments
// Waffenlisten abgeglichen am 23.11.2026: GGRanked, CODMunity und Warzone Loadout.

const GEAR_NAMES = new Map([
  ["Flash Grenade", "Blendgranate"],
  ["Smoke Grenade", "Rauchgranate"],
  ["Snapshot Grenade", "Schnappschussgranate"],
  ["Concussion Grenade", "Erschütterungsgranate"],
  ["Heartbeat Sensor", "Herzschlagsensor"],
  ["Shock Stick", "Schockstab"],
  ["Decoy Grenade", "Täuschgranate"],
  ["Stim", "Stim"],
  ["Screamer Mine", "Schreier-Mine"],
  ["Frag Grenade", "Splittergranate"],
  ["Sticky Grenade", "Haftgranate"],
  ["Drill Charge", "Bohrladung"],
  ["Proximity Mine", "Näherungsmine"],
  ["Zip Gun", "Einwegkanone"],
  ["Trip Wire", "Stolperdraht"],
  ["Thermite", "Thermit"],
  ["Molotov Cocktail", "Molotowcocktail"],
  ["Claymore", "Claymore"],
  ["C4", "C4"],
  ["Throwing Knife", "Wurfmesser"],
  ["Portable Radar", "Tragbares Radar"],
  ["DDOS", "DDOS"],
  ["Munitions Box", "Munitionskiste"],
  ["SAM Airburst Turret", "Boden-Luft-Geschütz"],
  ["Riot Shield", "Einsatzschild"],
  ["Trophy System", "Trophy-System"],
  ["Seeker Drone", "Sucherdrohne"],
  ["Inflatable Decoy", "Aufblasbarer Täuschkörper"],
  ["Smoke Wall", "Rauchwand"],
  ["Recon Drone", "Aufklärungsdrohne"],
  ["Razor Wire Trap", "Stacheldrahtfalle"],
  ["Tactical Insertion", "Taktikeinstieg"],
  ["Quick Fix", "Zusammenflicken"],
  ["Overkill", "Overkill"],
  ["High Alert", "Alarmiert"],
  ["Ghost", "Ghost"],
  ["Resupply", "Nachschub"],
  ["Kill Chain", "Abschusskette"],
  ["Hardline", "Hardliner"],
  ["Blood Rush", "Blutrausch"],
  ["Bomb Squad", "Bombenkommando"],
  ["Fast Hands", "Flinke Hände"],
  ["Ninja", "Ninja"],
  ["Birdseye", "Draufsicht"],
  ["Lethal Reach", "Tödliche Reichweite"],
  ["Combat Grid", "Kampfraster"],
  ["Battle Hardened", "Kampfgestählt"],
  ["Scavenger", "Plünderer"],
  ["Tracker", "Spurenleser"],
  ["Cold-Blooded", "Kaltblütig"],
]);

// Jeweils bisheriger und korrigierter Name, zuerst Deutsch, dann Englisch.
const ATTACHMENT_NAMES = new Map([
  ["1-2x28-dual-port", ["1/2X28 Dual Port", "1/2x28-Doppelbohrung", "1/2X28 Dual Port", "1/2x28 Dual Port"]],
  ["11-5-shortline-barrel", ["11.5\" Shortline Barrel", "11.5\" Shortline-Lauf", "11.5\" Shortline Barrel", "11.5 Shortline Barrel"]],
  ["14-round-mag", ["14 Round Mag", "14-Schuss-Magazin", "14 Round Mag", "14 Round Mag"]],
  ["150-round-box-mag", ["150 Round Box Mag", "150-Schuss-Kastenmagazin", "150 Round Box Mag", "150 Round Box Mag"]],
  ["16-highmark-barrel", ["16\" Highmark Barrel", "16\"-Highmark-Lauf", "16\" Highmark Barrel", "16 Highmark Barrel"]],
  ["18-le-crosswind", ["18\" LE Crosswind", "18\" LE Crosswind", "18\" LE Crosswind", "18 LE Crosswind"]],
  ["212-lc40-comp", ["212 LC40 Comp", "212 LC40-Kompensator", "212 LC40 Comp", "212 LC40 Comp"]],
  ["330tc2-gridlock", ["330TC2 Gridlock", "330TC2-Gridlock", "330TC2 Gridlock", "330TC2 Gridlock"]],
  ["35-round-mag", ["35 Round Mag", "35-Schuss-Magazin", "35 Round Mag", "35 Round Mag"]],
  ["45-auto-high-velocity", [".45 Auto High Velocity", ".45 Auto Hochgeschwindigkeit", ".45 Auto High Velocity", ".45 Auto High Velocity"]],
  ["45-auto-overpressured", [".45 Auto Overpressured", ".45 Auto Überdruck", ".45 Auto Overpressured", ".45 Auto Overpressured"]],
  ["45-round-mag-7-62", ["45 Round Mag 7.62", "7,62-Magazin (45 Schuss)", "45 Round Mag 7.62", "45 Round Mag 7.62"]],
  ["5-56-nato-armor-piercing", ["5.56 NATO Armor Piercing", "5,56 NATO Panzerbrechend", "5.56 NATO Armor Piercing", "5.56 NATO Armor Piercing"]],
  ["5-56-nato-frangible", ["5.56 NATO Frangible", "5,56 NATO Zerfall", "5.56 NATO Frangible", "5.56 NATO Frangible"]],
  ["5-56-nato-high-velocity", ["5.56 NATO High Velocity", "5,56 NATO Hochgeschwindigkeit", "5.56 NATO High Velocity", "5.56 NATO High Velocity"]],
  ["5-56-nato-hollow-point", ["5.56 NATO Hollow Point", "5,56 NATO Hohlspitz", "5.56 NATO Hollow Point", "5.56 NATO Hollow Point"]],
  ["5-8x21mm-overpressured", ["5.8x21mm Overpressured", "5,8x21mm Überdruck", "5.8x21mm Overpressured", "5.8x21mm Overpressured"]],
  ["53-round-mag", ["53 Round Mag", "53-Schuss-Magazin", "53 Round Mag", "53 Round Mag"]],
  ["6-8x43mm-armor-piercing", ["6.8x43mm Armor Piercing", "6,8x43mm Panzerbrechend", "6.8x43mm Armor Piercing", "6.8x43mm Armor Piercing"]],
  ["6-8x43mm-frangible", ["6.8x43mm Frangible", "6,8x43mm Zerfall", "6.8x43mm Frangible", "6.8x43mm Frangible"]],
  ["6-8x43mm-high-velocity", ["6.8x43mm High Velocity", "6,8x43mm Hochgeschwindigkeit", "6.8x43mm High Velocity", "6.8x43mm High Velocity"]],
  ["6-8x43mm-hollow-point", ["6.8x43mm Hollow Point", "6,8x43mm Hohlspitz", "6.8x43mm Hollow Point", "6.8x43mm Hollow Point"]],
  ["6-8x43mm-overpressured", ["6.8x43mm Overpressured", "6,8x43mm Überdruck", "6.8x43mm Overpressured", "6.8x43mm Overpressured"]],
  ["6-round-mag", ["6 Round Mag", "6-Schuss-Magazin", "6 Round Mag", "6 Round Mag"]],
  ["60-round-drum", ["60 Round Drum", "60-Schuss-Trommel", "60 Round Drum", "60 Round Drum"]],
  ["7-62-nato-armor-piercing", ["7.62 NATO Armor Piercing", "7,62 NATO Panzerbrechend", "7.62 NATO Armor Piercing", "7.62 NATO Armor Piercing"]],
  ["7-62-nato-frangible", ["7.62 NATO Frangible", "7,62 NATO Zerfall", "7.62 NATO Frangible", "7.62 NATO Frangible"]],
  ["7-62-nato-high-velocity", ["7.62 NATO High Velocity", "7,62 NATO Hochgeschwindigkeit", "7.62 NATO High Velocity", "7.62 NATO High Velocity"]],
  ["7-62-nato-hollow-point", ["7.62 NATO Hollow Point", "7,62 NATO Hohlspitz", "7.62 NATO Hollow Point", "7.62 NATO Hollow Point"]],
  ["7-62-soviet-armor-piercing", ["7.62 Soviet Armor Piercing", "7,62 Sowjet Panzerbrechend", "7.62 Soviet Armor Piercing", "7.62 Soviet Armor Piercing"]],
  ["7-62-soviet-frangible", ["7.62 Soviet Frangible", "7,62 Sowjet Zerfall", "7.62 Soviet Frangible", "7.62 Soviet Frangible"]],
  ["7-62-soviet-high-velocity", ["7.62 Soviet High Velocity", "7,62 Sowjet Hochgeschwindigkeit", "7.62 Soviet High Velocity", "7.62 Soviet High Velocity"]],
  ["7-62-soviet-hollow-point", ["7.62 Soviet Hollow Point", "7,62 Sowjet Hohlspitz", "7.62 Soviet Hollow Point", "7.62 Soviet Hollow Point"]],
  ["7-62-tokarev-armor-piercing", ["7.62 Tokarev Armor Piercing", "7,62 Tokarev Panzerbrechend", "7.62 Tokarev Armor Piercing", "7.62 Tokarev Armor Piercing"]],
  ["7-62-tokarev-frangible", ["7.62 Tokarev Frangible", "7,62 Tokarev Zerfall", "7.62 Tokarev Frangible", "7.62 Tokarev Frangible"]],
  ["7-62-tokarev-high-velocity", ["7.62 Tokarev High Velocity", "7,62 Tokarev Hochgeschwindigkeit", "7.62 Tokarev High Velocity", "7.62 Tokarev High Velocity"]],
  ["7-62-tokarev-hollow-point", ["7.62 Tokarev Hollow Point", "7,62 Tokarev Hohlspitz", "7.62 Tokarev Hollow Point", "7.62 Tokarev Hollow Point"]],
  ["7-62-tokarev-overpressured", ["7.62 Tokarev Overpressured", "7,62 Tokarev Überdruck", "7.62 Tokarev Overpressured", "7.62 Tokarev Overpressured"]],
  ["7-62x54mmr-armor-piercing", ["7.62x54mmR Armor Piercing", "7,62x54mmR Panzerbrechend", "7.62x54mmR Armor Piercing", "7.62x54mmR Armor Piercing"]],
  ["7-62x54mmr-frangible", ["7.62x54mmR Frangible", "7,62x54mmR Zerfall", "7.62x54mmR Frangible", "7.62x54mmR Frangible"]],
  ["7-62x54mmr-high-velocity", ["7.62x54mmR High Velocity", "7,62x54mmR Hochgeschwindigkeit", "7.62x54mmR High Velocity", "7.62x54mmR High Velocity"]],
  ["7-62x54mmr-hollow-point", ["7.62x54mmR Hollow Point", "7,62x54mmR Hohlspitz", "7.62x54mmR Hollow Point", "7.62x54mmR Hollow Point"]],
  ["75-round-box-mag", ["75 Round Box Mag", "75-Schuss-Kastenmagazin", "75 Round Box Mag", "75 Round Box Mag"]],
  ["75-round-drum-mag-7-62", ["75 Round Drum Mag 7.62", "7,62-Trommelmagazin (75 Schuss)", "75 Round Drum Mag 7.62", "75 Round Drum Mag 7.62"]],
  ["8-6mm-blackout-armor-piercing", ["8.6mm Blackout Armor Piercing", "8,6mm Blackout Panzerbrechend", "8.6mm Blackout Armor Piercing", "8.6mm Blackout Armor Piercing"]],
  ["8-6mm-blackout-frangible", ["8.6mm Blackout Frangible", "8,6mm Blackout Zerfall", "8.6mm Blackout Frangible", "8.6mm Blackout Frangible"]],
  ["8-6mm-blackout-hollow-point", ["8.6mm Blackout Hollow Point", "8,6mm Blackout Hohlspitz", "8.6mm Blackout Hollow Point", "8.6mm Blackout Hollow Point"]],
  ["9mm-parabellum-armor-piercing", ["9mm Parabellum Armor Piercing", "9mm Parabellum Panzerbrechend", "9mm Parabellum Armor Piercing", "9mm Parabellum Armor Piercing"]],
  ["9mm-parabellum-frangible", ["9mm Parabellum Frangible", "9mm Parabellum Zerfall", "9mm Parabellum Frangible", "9mm Parabellum Frangible"]],
  ["9mm-parabellum-high-velocity", ["9mm Parabellum High Velocity", "9mm Parabellum Hochgeschwindigkeit", "9mm Parabellum High Velocity", "9mm Parabellum High Velocity"]],
  ["9mm-parabellum-hollow-point", ["9mm Parabellum Hollow Point", "9mm Parabellum Hohlspitz", "9mm Parabellum Hollow Point", "9mm Parabellum Hollow Point"]],
  ["aa54-v-3-bipod", ["AA54 V.3 Bipod", "AA54-V.3-Zweibein", "AA54 V.3 Bipod", "AA54 V.3 Bipod"]],
  ["aa54-v3-bipod", ["AA54 V3 Bipod", "AA54-V.3-Zweibein", "AA54 V3 Bipod", "AA54 V.3 Bipod"]],
  ["apoc-338-praetor", ["APOC 338 Prätor", "APOC-338 Praetor", "APOC 338 Praetor", "APOC-338 Praetor"]],
  ["assault-l5-grip", ["Assault-L5 Grip", "L5-Sturmgriff", "Assault-L5 Grip", "Assault-L5 Grip"]],
  ["assault-l9-wood-grip", ["Assault-L9 Wood Grip", "Assault-L9-Holzgriff", "Assault-L9 Wood Grip", "Assault-L9 Wood Grip"]],
  ["astaroth-57-11-2x-scope", ["Astaroth .57 11.2X Scope", "Astaroth .57 11,2x-Zielfernrohr", "Astaroth .57 11.2X Scope", "Astaroth .57 11.2x Scope"]],
  ["axion-clearcut", ["Axion Clearcut", "Axion Reaver", "Axion Clearcut", "Axion Reaver"]],
  ["axion-reaver", ["Axion Zerstörer", "Axion Reaver", "Axion Reaver", "Axion Reaver"]],
  ["brace-dx-grip", ["Brace DX Grip", "Brace-DX-Griff", "Brace DX Grip", "Brace DX Grip"]],
  ["brch-9-v-2", ["BRCH-9  v.2", "BRCH-9 v.2", "BRCH-9 v.2", "BRCH-9 v.2"]],
  ["bruen-br-21-bipod", ["Bruen BR 21 Bipod", "Bruen BR 21-Zweibein", "Bruen BR 21 Bipod", "Bruen BR 21 Bipod"]],
  ["bruen-c-wrap-60", ["Bruen C-Wrap 60", "Bruen-C-60-Griffband", "Bruen C-Wrap 60", "Bruen C-Wrap 60"]],
  ["bruen-mod3", ["Bruen Mod3", "Bruen MOD3", "Bruen Mod3", "Bruen MOD3"]],
  ["bruen-operator-50-grip", ["Bruen Operator .50 Grip", "Bruen Operator .50 Griff", "Bruen Operator .50 Grip", "Bruen Operator .50 Grip"]],
  ["bruen-r7-tc-grip", ["Bruen R7-TC Grip", "Bruen-R7-TC-Griff", "Bruen R7-TC Grip", "Bruen R7-TC Grip"]],
  ["bruen-renegade-grip", ["Bruen Renegade Grip", "Bruen-Renegade-Griff", "Bruen Renegade Grip", "Bruen Renegade Grip"]],
  ["bruen-thrm-60-optic", ["Bruen THRM-60 Optic", "Bruen THRM-60-Visier", "Bruen THRM-60 Optic", "Bruen THRM-60 Optic"]],
  ["corio-d51-scope", ["Corio D51 Scope", "Corio D51-Zielfernrohr", "Corio D51 Scope", "Corio D51 Scope"]],
  ["cronen-sn-pad50", ["Cronen SN-PAD50", "Cronen SN-Pad50", "Cronen SN-PAD50", "Cronen SN-Pad50"]],
  ["custom-ironsights", ["Custom Ironsights", "Maßgeschneidertes offenes Visier", "Custom Ironsights", "Custom Ironsights"]],
  ["demo-dozer-stock", ["Demo Dozer Stock", "Demo Dozer-Schaft", "Demo Dozer Stock", "Demo Dozer Stock"]],
  ["demo-hvr2-stock", ["Demo HVR2 Stock", "Demo-HVR2-Schaft", "Demo HVR2 Stock", "Demo HVR2 Stock"]],
  ["demo-ironshade", ["Demo Ironshade", "DEMO Ironshade", "Demo Ironshade", "DEMO Ironshade"]],
  ["demo-kilo90-stock", ["Demo Kilo90 Stock", "Demo Kilo90-Schaft", "Demo Kilo90 Stock", "Demo Kilo90 Stock"]],
  ["exp-g2-44-stock", ["EXP G2-44 Stock", "EXP-G2-44-Schaft", "EXP G2-44 Stock", "EXP G2-44 Stock"]],
  ["exp-v-tac-suppressor", ["EXP V-Tac Suppressor", "EXP V-Tac-Schalldämpfer", "EXP V-Tac Suppressor", "EXP V-TAC Suppressor"]],
  ["expedite-intra-5b", ["Expedite Intra-5B", "Expedite Intra-5b", "Expedite Intra-5B", "Expedite Intra-5b"]],
  ["field-tac-1-4-comp", ["Field Tac 1.4 Comp", "Field Tac 1.4-Kompensator", "Field Tac 1.4 Comp", "Field Tac 1.4 Comp"]],
  ["finn-adverse", ["Finn Adverse", "FiNN Adverse", "Finn Adverse", "FiNN Adverse"]],
  ["fjx-708-pro", ["FJX 708 Pro", "FJX 708 PRO", "FJX 708 Pro", "FJX 708 PRO"]],
  ["fjx-ghostfire-16-3", ["FJX Ghostfire 16.3\"", "FJX Ghostfire 16,3\"", "FJX Ghostfire 16.3\"", "FJX Ghostfire 16.3\""]],
  ["fjx-kastov-grip", ["FJX Kastov Grip", "FJX Kastov-Griff", "FJX Kastov Grip", "FJX Kastov Grip"]],
  ["fr4-retractable-stock", ["FR4 Retractable Stock", "FR4 Ausfahrbarer Schaft", "FR4 Retractable Stock", "FR4 Retractable Stock"]],
  ["fss-fireline-grip", ["FSS Fireline Grip", "FSS-Fireline-Griff", "FSS Fireline Grip", "FSS Fireline Grip"]],
  ["fss-moodkiller", ["FSS Moodkiller", "FSS-Stimmungskiller", "FSS Moodkiller", "FSS Moodkiller"]],
  ["fss-tac90-grip", ["FSS TAC90 Grip", "FSS-Tac90-Griff", "FSS TAC90 Grip", "FSS Tac90 Grip"]],
  ["ftac-combat-grip", ["FTAC Combat Grip", "FTAC-Gefechtsgriff", "FTAC Combat Grip", "FTAC Combat Grip"]],
  ["ftac-r7-wrap", ["FTAC R7 Wrap", "FTAC R7-Griffband", "FTAC R7 Wrap", "FTAC R7 Wrap"]],
  ["ftac-rzr0-stock", ["FTAC RZR0 Stock", "FTAC RZR0-Schaft", "FTAC RZR0 Stock", "FTAC RZR0 Stock"]],
  ["ftac-silent-recon", ["FTAC Silent Recon", "FTAC-Tarnaufklärung", "FTAC Silent Recon", "FTAC Silent Recon"]],
  ["full-port-comp", ["Full Port Comp", "Komplett gebohrter Kompensator", "Full Port Comp", "Full Port Comp"]],
  ["gauge-12-mono", ["Gauge-12 Mono", "Kaliber-12-Mono", "Gauge-12 Mono", "Gauge-12 Mono"]],
  ["gi-80-milspec-stock", ["GI-80 Milspec Stock", "GI-80-Militärschaft", "GI-80 Milspec Stock", "GI-80 MilSpec Stock"]],
  ["gw-domi-9", ["GW DOMI-9", "GW Domi-9", "GW DOMI-9", "GW Domi-9"]],
  ["haebang-naseon-v-5-26", ["Haebang Naseon V.5 26\"", "Haebang Naseon v.5 26\"", "Haebang Naseon V.5 26\"", "Haebang Naseon v.5 26\""]],
  ["han-x20-skybreaker", ["HAN X20 Skybreaker", "Han X20 Himmelsbrecher", "HAN X20 Skybreaker", "Han X20 Skybreaker"]],
  ["hanbit-655l-m-stock", ["Hanbit 655L-M Stock", "Hanbit 655L-M-Schaft", "Hanbit 655L-M Stock", "Hanbit 655L-M Stock"]],
  ["hanbit-blitz-v-9", ["Hanbit Blitz V.9", "Hanbit Blitz v.9", "Hanbit Blitz V.9", "Hanbit Blitz v.9"]],
  ["hanbit-h86-grip", ["Hanbit H86 Grip", "Hanbit H86-Griff", "Hanbit H86 Grip", "Hanbit H86 Grip"]],
  ["hanbit-techgrip", ["Hanbit Techgrip", "Hanbit TechGrip", "Hanbit Techgrip", "Hanbit TechGrip"]],
  ["hanbit-wrap-76", ["Hanbit Wrap 76", "Hanbit-76-Griffband", "Hanbit Wrap 76", "Hanbit Wrap 76"]],
  ["het-s6-comp", ["HET-S6 Comp", "HET-S6-Kompensator", "HET-S6 Comp", "HET-S6 Comp"]],
  ["hurricane-grip", ["Hurricane Grip", "Hurricane-Griff", "Hurricane Grip", "Hurricane Grip"]],
  ["hurricane-stock", ["Hurricane Stock", "Hurrikan-Schaft", "Hurricane Stock", "Hurricane Stock"]],
  ["hvy-80-stockpad", ["HVY-80 Stockpad", "HVY-80-Schaftpolster", "HVY-80 Stockpad", "HVY-80 Stockpad"]],
  ["hyeon-stockpad-tac", ["Hyeon Stockpad Tac", "Hyeon-Taktik-Schaftpolster", "Hyeon Stockpad Tac", "Hyeon Stockpad Tac"]],
  ["i-comp-45-auto", ["I-Comp .45 Auto", "I-Komp .45 Auto", "I-Comp .45 Auto", "I-Comp .45 Auto"]],
  ["iota-d", ["Iota-D", "IOTA-D", "Iota-D", "IOTA-D"]],
  ["kastov-combat-lite-stock", ["Kastov Combat Lite Stock", "Kastov-Lite-Gefechtsschaft", "Kastov Combat Lite Stock", "Kastov Combat Lite Stock"]],
  ["kg-7-bipod", ["KG-7 Bipod", "KG-7-Zweibein", "KG-7 Bipod", "KG-7 Bipod"]],
  ["kg-7-drillcharge", ["KG-7 Bohrmagazin", "KG-7 Bohrladung", "KG-7 Drillcharge", "KG-7 Drillcharge"]],
  ["kg-7-vulcan-11-2x-scope", ["KG-7 Vulcan 11.2X Scope", "KG-7 Vulcan 11,2x Zielfernrohr", "KG-7 Vulcan 11.2X Scope", "KG-7 Vulcan 11.2x Scope"]],
  ["kg-9-drillcharge", ["KG-9 Drillcharge", "KG-7 Bohrladung", "KG-9 Drillcharge", "KG-7 Drillcharge"]],
  ["krait-p68-commando", ["Krait P68 Commando", "Krait P68 Kommando", "Krait P68 Commando", "Krait P68 Commando"]],
  ["kt76-light-bolt", ["KT76 Light Bolt", "Leichter KT76-Bolzen", "KT76 Light Bolt", "KT76 Light Bolt"]],
  ["l980-s-comp", ["L980-S Comp", "L980-S-Kompensator", "L980-S Comp", "L980-S Comp"]],
  ["lm-stock-sleeve", ["LM Stock Sleeve", "LM-Schafthülse", "LM Stock Sleeve", "LM Stock Sleeve"]],
  ["locus-px3-canted", ["Locus PX3 Canted", "Locus PX3 Geneigt", "Locus PX3 Canted", "Locus PX3 Canted"]],
  ["magtac-45", ["Magtac .45", "MAGTAC .45", "Magtac .45", "MAGTAC .45"]],
  ["mar-9-auto", ["MAR-9 Auto", "MAR-9 Autom.", "MAR-9 Auto", "MAR-9E1"]],
  ["meiko-30cal-sp", ["Meiko 30Cal-SP", "Meiko 30CAL-SP", "Meiko 30Cal-SP", "Meiko 30CAL-SP"]],
  ["meiko-l9p-fold", ["Meiko L9P-Fold", "Meiko-L9P-Klappschaft", "Meiko L9P-Fold", "Meiko L9P-Fold"]],
  ["mg-tac-trigger", ["MG-TAC Trigger", "MG-Taktikabzug", "MG-TAC Trigger", "MG-Tac Trigger"]],
  ["mil-56-9-heavy-trigger", ["MIL-56.9 Heavy Trigger", "Schwerer Mil-56,9-Abzug", "MIL-56.9 Heavy Trigger", "Mil-56.9 Heavy Trigger"]],
  ["mire-50-tac-grip", ["MIRE-50 Tac Grip", "Mire-50-Taktikgriff", "MIRE-50 Tac Grip", "Mire-50 Tac Grip"]],
  ["miri-40mm", ["MIRI 40mm", "Miri 40mm", "MIRI 40mm", "Miri 40mm"]],
  ["mojave-357-lawless", ["Mojave Lawless", "Mojave Lawless", "Mojave .357 Lawless", "Mojave Lawless"]],
  ["mosin-harpoon", ["Mosin Harpune", "Mosin-Harpune", "Mosin Harpoon", "Mosin Harpoon"]],
  ["mugi-00-yk1-grip", ["Mugi 00-YK1 Grip", "Mugi 00-YK1-Griff", "Mugi 00-YK1 Grip", "Mugi 00-YK1 Grip"]],
  ["mugi-bal-202-stock", ["Mugi BAL-202 Stock", "Mugi BAL-202-Schaft", "Mugi BAL-202 Stock", "Mugi BAL-202 Stock"]],
  ["mugi-un-r5-grip", ["Mugi UN-R5 Grip", "Mugi UN-R5-Griff", "Mugi UN-R5 Grip", "Mugi UN-R5 Grip"]],
  ["octa-63-comp", ["OCTA-63 Comp", "Octa-63-Kompensator", "OCTA-63 Comp", "Octa-63 Comp"]],
  ["oden-sentinel", ["Oden Sentinel", "Oden-Wächter", "Oden Sentinel", "Oden Sentinel"]],
  ["ops-45-xp-grip", ["OPS-45 XP Grip", "OPS-45 XP-Griff", "OPS-45 XP Grip", "OPS-45 XP Grip"]],
  ["oris-8-6-razor", ["Oris 8.6 Razor", "Oris 8,6 Razor", "Oris 8.6 Razor", "Oris 8.6 Razor"]],
  ["pf1-fixed-stock", ["PF1 Fixed Stock", "Fixierter PF1-Schaft", "PF1 Fixed Stock", "PF1 Fixed Stock"]],
  ["pom12-f-grip", ["POM12-F Grip", "POM12-F-Griff", "POM12-F Grip", "POM12-F Grip"]],
  ["ppsh-41-ember", ["PPSH-41 Ember", "PPSh-41 Ember", "PPSH-41 Ember", "PPSh-41 Ember"]],
  ["pulse-mw-laser", ["Pulse-MW Laser", "Pulse-MW-Laser", "Pulse-MW Laser", "Pulse-MW Laser"]],
  ["rezi-12-enforcer", ["Rezi 12 Enforcer", "Rezi 12 Vollstrecker", "Rezi 12 Enforcer", "Rezi 12 Enforcer"]],
  ["rushline-l-watt20", ["Rushline L-Watt20", "Rushline L-Watt20", "Rushline L-Watt20", "Rushline L-WATT20"]],
  ["sa-b40-grip", ["SA B40 Grip", "SA B40-Griff", "SA B40 Grip", "SA B40 Grip"]],
  ["sa-dynamo-90-stock", ["SA Dynamo-90 Stock", "SA Dynamo-90-Schaft", "SA Dynamo-90 Stock", "SA Dynamo-90 Stock"]],
  ["sa-firerush-23-8", ["SA Firerush 23.8\"", "SA Firerush 23,8\"", "SA Firerush 23.8\"", "SA Firerush 23.8\""]],
  ["sa-laz-500", ["SA LAZ-500", "SA Laz-500", "SA LAZ-500", "SA Laz-500"]],
  ["sa-sentinel-30-4", ["SA Sentinel 30.4\"", "SA Sentinel 30,4\"", "SA Sentinel 30.4\"", "SA Sentinel 30.4\""]],
  ["sakin-v14-tactical", ["Sakin V14 Tactical", "Sakin V14 Taktik", "Sakin V14 Tactical", "Sakin V14 Tactical"]],
  ["sang-breach", ["Sang Breach", "SANG-Durchbruch", "Sang Breach", "SANG Breach"]],
  ["schlager-7x", ["Schlager 7X", "Schlager 7x", "Schlager 7X", "Schlager 7x"]],
  ["schlager-attack-7-grip", ["Schlager Attack-7 Grip", "Schlager Attack-7-Griff", "Schlager Attack-7 Grip", "Schlager Attack-7 Grip"]],
  ["schlager-night-view-pro", ["Schlager Night View Pro", "Schlager-Nachtsicht-Pro", "Schlager Night View Pro", "Schlager Night View Pro"]],
  ["schlager-stb-grip", ["Schlager STB Grip", "Schlager-STB-Griff", "Schlager STB Grip", "Schlager STB Grip"]],
  ["schlager-visiv-5", ["Schlager VISIV-5", "Schlager Visiv-5", "Schlager VISIV-5", "Schlager Visiv-5"]],
  ["shonay-r-wrap", ["Shonay R-Wrap", "Shonay-R-Griffband", "Shonay R-Wrap", "Shonay R-Wrap"]],
  ["signal-50-11-2x-scope", ["Signal 50 11.2X Scope", "Signal 50 11,2x-Zielfernrohr", "Signal 50 11.2X Scope", "Signal 50 11.2x Scope"]],
  ["signal-50-inferno", ["Signal 50 Inferno", "Signal-Inferno", "Signal 50 Inferno", "Signal Inferno"]],
  ["signal-inferno", ["Signal Inferno", "Signal-Inferno", "Signal Inferno", "Signal Inferno"]],
  ["spetsnaz-s10-stock", ["Spetsnaz S10 Stock", "Spetsnaz S10-Schaft", "Spetsnaz S10 Stock", "Spetsnaz S10 Stock"]],
  ["st-v-1-woodgrain", ["ST V.1 Woodgrain", "ST v.1 Holzmaserung", "ST V.1 Woodgrain", "ST v.1 Woodgrain"]],
  ["sz-cnt-r6-optic", ["SZ CNT-R6 Optic", "SZ CNT-R6-Visier", "SZ CNT-R6 Optic", "SZ CNT-R6 Optic"]],
  ["sz-micro-o-3", ["SZ Micro O-3", "SZ Micro D-3", "SZ Micro O-3", "SZ Micro D-3"]],
  ["sz-prima-4-dot", ["SZ Prima-4 Dot", "SZ Prima-4 Punkt", "SZ Prima-4 Dot", "SZ Prima-4 Dot"]],
  ["ta-tacpro-56", ["TA TACPRO-56", "TA TacPro-56", "TA TACPRO-56", "TA TacPro-56"]],
  ["tt-g76-rp-stock", ["TT G76-RP Stock", "TT G76-RP-Schaft", "TT G76-RP Stock", "TT G76-RP Stock"]],
  ["tt-type-40-comb", ["TT Type 40 Comb", "TT Typ 40-Schaftrücken", "TT Type 40 Comb", "TT Type 40 Comb"]],
  ["twist76-heavy-bolt", ["Twist76 Heavy Bolt", "Schwerer Twist76-Bolzen", "Twist76 Heavy Bolt", "Twist76 Heavy Bolt"]],
  ["type-73-assault", ["Type 73 Assault", "Type 73 (Sturm)", "Type 73 Assault", "Type 73 Assault"]],
  ["vx86-heavy-bolt", ["VX86 Heavy Bolt", "Schwerer VX86-Bolzen", "VX86 Heavy Bolt", "VX86 Heavy Bolt"]],
  ["warlord-lumen", ["Kriegsherr Lumen", "Warlord Lumen", "Warlord Lumen", "Warlord Lumen"]],
  ["wz-55-striga-rampage", ["Wz.55 Striga Rampage", "WZ.55 Striga Rampage", "Wz.55 Striga Rampage", "WZ.55 Striga Rampage"]],
  ["x-vector-799-grip", ["X-Vector 799 Grip", "X-Vector 799-Griff", "X-Vector 799 Grip", "X-Vector 799 Grip"]],
  ["xrk-doc-40-6", ["XRK DOC-40 6\"", "XRK Doc-40 6\"", "XRK DOC-40 6\"", "XRK Doc-40 6\""]],
  ["xrk-firewrath-stock", ["XRK Firewrath Stock", "XRK Firewrath-Schaft", "XRK Firewrath Stock", "XRK Firewrath Stock"]],
  ["xrk-mil-tac-suppressor", ["XRK Mil-Tac Suppressor", "XRK-Mil-Tac-Schalldämpfer", "XRK Mil-Tac Suppressor", "XRK Mil-Tac Suppressor"]],
  ["zlr-12ga-ported-21", ["ZLR 12GA Ported 21\"", "ZLR 12GA 21\" Gebohrt", "ZLR 12GA Ported 21\"", "ZLR 12GA Ported 21\""]],
  ["zlr-asp50-stock", ["ZLR ASP50 Stock", "ZLR ASP50-Schaft", "ZLR ASP50 Stock", "ZLR ASP50 Stock"]],
  ["zlr-competition-b6", ["ZLR Competition-B6", "ZLR-B6-Wettkampfbolzen", "ZLR Competition-B6", "ZLR Competition-B6"]],
  ["zlr-phase-grip", ["ZLR Phase Grip", "ZLR-Phasengriff", "ZLR Phase Grip", "ZLR Phase Grip"]],
  ["zlr-tac12-pro", ["ZLR TAC12 Pro", "ZLR Tac12 Pro", "ZLR TAC12 Pro", "ZLR Tac12 Pro"]],
  ["zlr-type-c", ["ZLR Type C", "ZLR Typ C", "ZLR Type C", "ZLR Type C"]],
]);

const WEAPON_ADDITIONS = new Map([
  ["mw4-axion", [
    "aa54-v-3-bipod", "b16-helical", "bruen-thrm-60-optic", "corio-bisect", "corvus-lvl-40",
    "cronen-r808", "expedite-21-cfr", "expedite-squad-304", "fjx-708-pro", "fjx-evr7", "fss-beargrip",
    "fss-fireline-grip", "fss-is300", "ftac-dominion", "gl-k230", "gw-domi-9", "iota-d", "kv-corsac-holo",
    "locus-px3-canted", "mire-50-tac-grip", "miri-40mm", "pulse-mw-laser", "qfl-s4-5", "rvx9-thermo",
    "schlager-7x", "schlager-dogfight-gi", "schlager-night-view-pro", "slimline-elite", "sz-echelon-holo",
    "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot",
    "sz-sre-7", "tv-judicator", "tzl-110-v1", "vlk-rize-40", "vlk-trimmer", "xrk-clutch-ls",
    "xrk-mil-tac-suppressor", "zlr-reverb90", "zlr-type-c",
  ]],
  ["mw4-finn-lmg", [
    "bruen-22-lpw", "schlager-night-view-pro", "stovl-irx-6", "sz-micro-d-3",
  ]],
  ["mw4-han-86", [
    "aa54-v-3-bipod", "bruen-thrm-60-optic", "iota-d", "sz-micro-d-3",
  ]],
  ["mw4-hyeon-burst", [
    "schlager-dogfight-gi", "schlager-night-view-pro",
  ]],
  ["mw4-iso-nightshade", [
    "iota-d", "sz-micro-d-3",
  ]],
  ["mw4-kastov-762", [
    "aa54-v-3-bipod", "sz-micro-d-3",
  ]],
  ["mw4-mojave-357", [
    "bruen-clash-40", "bruen-field-op", "bruen-thrm-60-optic", "cronen-zero-k", "fjx-708-pro",
    "fss-phosphor-40", "gw-700-v", "kv-corsac-holo", "sz-echelon-holo", "sz-helios-holo",
    "sz-lonewolf-holo", "sz-micro-d-3", "sz-sre-7", "vlk-trimmer", "xt-100", "z-dot-9",
  ]],
  ["mw4-oris-8-6", [
    "sz-micro-d-3",
  ]],
  ["mw4-patriot-xmr", [
    "aa54-v-3-bipod", "bruen-22-lpw", "bruen-thrm-60-optic", "corio-4dv-3", "corio-bisect", "corio-odspr",
    "cronen-r808", "expedite-intra-5b", "fjx-708-pro", "fss-beargrip", "fss-fireline-grip", "gl-k230",
    "gw-domi-9", "iota-d", "kv-corsac-holo", "locus-px3-canted", "mire-50-tac-grip", "no-stock",
    "rvx9-thermo", "sa-laz-500", "schlager-7x", "schlager-dogfight-gi", "schlager-night-view-pro",
    "slimline-elite", "stovl-irx-6", "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip",
    "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot", "sz-sre-7", "vlk-rize-40", "vlk-trimmer",
    "zlr-type-c",
  ]],
  ["mw4-ppsh-41", [
    "sz-micro-d-3",
  ]],
  ["mw4-rezi-12", [
    "sz-micro-d-3",
  ]],
  ["mw4-sang-9mm", [
    "9mm-parabellum-frangible", "9mm-parabellum-high-velocity", "9mm-parabellum-hollow-point",
    "9mm-parabellum-overpressured", "bruen-clash-40", "cronen-zero-k",
  ]],
  ["mw4-signal-50", [
    "astaroth-57-11-2x-scope", "bl-a5-comp", "bruen-maestro", "bruen-thrm-60-optic", "corio-bisect",
    "corio-d51-scope", "corvus-avis-0", "cronen-jab-60", "ds-op-67m-flash", "expedite-21-cfr",
    "expedite-308-dr2", "fjx-708-pro", "fjx-evr7", "fss-beargrip", "fss-fireline-grip", "fss-tac90-grip",
    "gl-k230", "gw-domi-9", "gw-lowe-55", "hanbit-3080-fireline", "iota-d", "kg-7-vulcan-11-2x-scope",
    "kv-corsac-holo", "lm-deadstop-99", "locus-px3-canted", "luca-stormwatch", "mire-50-tac-grip",
    "rvx9-thermo", "schlager-bigsky", "schlager-dogfight-gi", "schlager-indigo-rf",
    "schlager-night-view-pro", "schlager-visiv-5", "slimline-elite", "sz-castaway", "sz-echelon-holo",
    "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot",
    "sz-sre-7", "ta-honeypot-670", "vlk-rize-40", "vlk-trimmer", "zlr-type-c",
  ]],
  ["mw4-type-73", [
    "schlager-dogfight-gi", "schlager-night-view-pro",
  ]],
  ["mw4-wz-55-striga", [
    "bruen-thrm-60-optic", "cronen-r808", "expedite-21-cfr", "expedite-squad-304", "fjx-708-pro",
    "fjx-evr7", "fss-fireline-grip", "fss-tac90-grip", "gl-k230", "gw-domi-9", "iota-d", "kv-corsac-holo",
    "mire-50-tac-grip", "pulse-mw-laser", "schlager-night-view-pro", "slimline-elite", "sz-echelon-holo",
    "sz-helios-holo", "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot", "sz-sre-7", "vlk-trimmer",
    "xrk-clutch-ls",
  ]],
  ["mw4-x-58-nyx", [
    "bruen-thrm-60-optic", "corio-bisect", "cronen-r808", "expedite-21-cfr", "expedite-squad-304",
    "fjx-708-pro", "fjx-evr7", "fss-fireline-grip", "gl-k230", "gw-domi-9", "iota-d", "kv-corsac-holo",
    "mire-50-tac-grip", "pulse-mw-laser", "qfl-s4-5", "schlager-night-view-pro", "slimline-elite",
    "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3",
    "sz-prima-4-dot", "sz-sre-7", "vlk-trimmer", "xrk-clutch-ls", "zlr-type-c",
  ]],
  ["mw4-mar-9", [
    "sz-micro-d-3",
  ]],
  ["mw4-kg-7-vulcan", [
    "7-62x54mmr-armor-piercing", "7-62x54mmr-frangible", "7-62x54mmr-high-velocity",
    "7-62x54mmr-hollow-point", "7-62x54mmr-overpressured", "sz-micro-d-3",
  ]],
  ["mw4-50-gs", [
    "bruen-clash-40", "bruen-thrm-60-optic", "corvus-aves-3", "cronen-r808", "cronen-zero-k",
    "fss-phosphor-40", "gl-k230", "gw-domi-9", "gw-mdl-2", "kv-corsac-holo", "mire-50-tac-grip",
    "schlager-night-view-pro", "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-holo", "sz-micro-d-3",
    "sz-sre-7", "vlk-trimmer", "z-dot-9",
  ]],
  ["mw4-apoc-338", [
    "brch-9-v-2", "bryson-bullhide-90", "corio-4dv-3", "corio-bisect", "corio-odspr", "fjx-708-pro",
    "ftac-combat-grip", "gl-k230", "iota-d", "k41a2-comp", "kv-corsac-holo", "locus-px3-canted",
    "rvx9-thermo", "sa-laz-500", "schlager-7x", "schlager-dogfight-gi", "schlager-night-view-pro",
    "schlager-operator-s70", "slimline-elite", "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip",
    "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot", "sz-sre-7", "vgd-11-flash", "vlk-rize-40",
    "vlk-trimmer",
  ]],
  ["mw4-astaroth-57", [
    "bruen-maestro", "corio-bisect", "corio-d51-scope", "corvus-avis-0", "cronen-r808",
    "expedite-308-dr2", "fjx-evr7", "gl-k230", "gw-lowe-55", "hanbit-3080-fireline", "locus-px3-canted",
    "luca-stormwatch", "rvx9-thermo", "schlager-bigsky", "schlager-dogfight-gi", "schlager-indigo-rf",
    "schlager-night-view-pro", "signal-50-11-2x-scope", "sz-castaway", "sz-lonewolf-flip", "vlk-rize-40",
  ]],
  ["mw4-cronen-osprey", [
    "100-round-drum", "5-56-nato-armor-piercing", "5-56-nato-frangible", "5-56-nato-high-velocity",
    "5-56-nato-hollow-point", "5-56-nato-overpressured", "aa54-v-3-bipod", "b16-helical", "bruen-22-lpw",
    "bruen-thrm-60-optic", "corio-4dv-3", "corio-odspr", "corvus-lvl-40", "cronen-r808",
    "expedite-intra-5b", "fjx-708-pro", "fss-beargrip", "fss-fireline-grip", "fss-is300", "fss-is40",
    "ftac-dominion", "gl-k230", "gw-domi-9", "iota-d", "kv-corsac-holo", "locus-px3-canted",
    "mire-50-tac-grip", "miri-40mm", "rvx9-thermo", "schlager-7x", "schlager-dogfight-gi",
    "schlager-night-view-pro", "slimline-elite", "stovl-irx-6", "sz-echelon-holo", "sz-helios-holo",
    "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot", "sz-sre-7", "tv-judicator", "tzl-110-v1",
    "vlk-rize-40", "vlk-trimmer", "zlr-reverb90", "zlr-type-c",
  ]],
  ["mw4-cronen-squall", [
    "bruen-22-lpw", "bruen-thrm-60-optic", "corio-4dv-3", "corio-bisect", "corio-odspr", "cronen-r808",
    "exp-undertow-gen-2", "expedite-intra-5b", "fjx-708-pro", "fss-beargrip", "fss-fireline-grip",
    "gl-k230", "gw-domi-9", "het-s6-comp", "iota-d", "kv-corsac-holo", "locus-px3-canted",
    "matuzek-blackveil", "mire-50-tac-grip", "miri-40mm", "octa-63-comp", "rvx9-thermo", "sa-laz-500",
    "schlager-7x", "schlager-dogfight-gi", "schlager-night-view-pro", "slimline-elite", "stovl-irx-6",
    "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3",
    "sz-prima-4-dot", "sz-sre-7", "tv-bitelock", "tv-judicator", "vlk-rize-40", "vlk-trimmer",
  ]],
  ["mw4-csg-35", [
    "9mm-parabellum-armor-piercing", "9mm-parabellum-frangible", "9mm-parabellum-high-velocity",
    "9mm-parabellum-hollow-point", "9mm-parabellum-overpressured", "bruen-22-lpw", "bruen-clash-40",
    "corio-4dv-3", "corio-odspr", "cronen-zero-k", "expedite-intra-5b", "fjx-708-pro", "sa-laz-500",
    "stovl-irx-6", "sz-micro-d-3", "sz-sre-7", "vlk-trimmer", "z-dot-9",
  ]],
  ["mw4-mosin-nagant", [
    "7-62x54mmr-armor-piercing", "7-62x54mmr-frangible", "7-62x54mmr-high-velocity",
    "7-62x54mmr-hollow-point", "7-62x54mmr-overpressured", "770-underbite", "aa54-v-3-bipod",
    "bruen-thrm-60-optic", "corio-d51-scope", "ds-rkt-90", "exp-r3000-v", "expedite-21-cfr",
    "expedite-308-dr2", "field-tac-1-4-comp", "fjx-708-pro", "fjx-evr7", "fss-beargrip",
    "fss-fireline-grip", "fss-tac90-grip", "ftac-silent-recon", "gl-k230", "gw-domi-9", "gw-lowe-55",
    "iota-d", "kv-corsac-holo", "luca-stormwatch", "mire-50-tac-grip", "rvx9-thermo", "schlager-7x",
    "schlager-dogfight-gi", "schlager-indigo-rf", "schlager-night-view-pro", "slimline-elite",
    "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3",
    "sz-prima-4-dot", "sz-sre-7", "usenko-308-1l", "vlk-rize-40", "vlk-trimmer", "xrk-clutch-ls",
    "zlr-type-c",
  ]],
  ["mw4-oden", [
    "aa54-v-3-bipod", "bruen-thrm-60-optic", "corio-bisect", "cronen-r808", "expedite-21-cfr",
    "fjx-708-pro", "fjx-evr7", "fss-beargrip", "fss-fireline-grip", "gl-k230", "gw-domi-9", "iota-d",
    "kv-corsac-holo", "locus-px3-canted", "mire-50-tac-grip", "miri-40mm", "rvx9-thermo", "schlager-7x",
    "schlager-dogfight-gi", "schlager-night-view-pro", "slimline-elite", "sz-echelon-holo",
    "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot",
    "sz-sre-7", "tv-judicator", "vlk-rize-40", "vlk-trimmer", "zlr-type-c",
  ]],
  ["mw4-vel-46", [
    "212-lc40-comp", "30-round-mag", "bruen-thrm-60-optic", "corio-bisect", "cronen-r808",
    "demo-ironshade", "expedite-21-cfr", "expedite-squad-304", "fjx-708-pro", "fjx-evr7",
    "fss-fireline-grip", "gl-k230", "gw-domi-9", "haebang-orc70", "hanbit-chevron", "iota-d",
    "kv-corsac-holo", "pulse-mw-laser", "qfl-s4-5", "schlager-night-view-pro", "slimline-elite",
    "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip", "sz-lonewolf-holo", "sz-micro-d-3",
    "sz-prima-4-dot", "sz-sre-7", "ta-lightning-r3m", "ta-tacpro-56", "vlk-trimmer", "xrk-herder-40",
    "zlr-type-c",
  ]],
  ["mw4-warlord", [
    "12-gauge-slug", "bruen-22-lpw", "bruen-thrm-60-optic", "corio-4dv-3", "corio-bisect", "corio-odspr",
    "cronen-r808", "expedite-intra-5b", "fjx-708-pro", "fss-fireline-grip", "fss-tac90-grip", "gl-k230",
    "gw-domi-9", "iota-d", "kv-corsac-holo", "mire-50-tac-grip", "sa-laz-500", "schlager-night-view-pro",
    "slimline-elite", "stovl-irx-6", "sz-echelon-holo", "sz-helios-holo", "sz-lonewolf-flip",
    "sz-lonewolf-holo", "sz-micro-d-3", "sz-prima-4-dot", "sz-sre-7", "vlk-trimmer", "zlr-swordfish",
    "zlr-type-c",
  ]],
]);

const ATTACHMENT_ALIASES = new Map([
  ["mw4-axion", new Map([["axion-clearcut", "axion-reaver"]])],
  ["mw4-kg-7-vulcan", new Map([["kg-9-drillcharge", "kg-7-drillcharge"], ["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-signal-50", new Map([["signal-50-inferno", "signal-inferno"]])],
  ["mw4-finn-lmg", new Map([["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-han-86", new Map([["aa54-v3-bipod", "aa54-v-3-bipod"], ["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-iso-nightshade", new Map([["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-kastov-762", new Map([["aa54-v3-bipod", "aa54-v-3-bipod"], ["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-oris-8-6", new Map([["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-ppsh-41", new Map([["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-rezi-12", new Map([["sz-micro-o-3", "sz-micro-d-3"]])],
  ["mw4-mar-9", new Map([["sz-micro-o-3", "sz-micro-d-3"]])],
]);

const normalizedName = (name) => String(name ?? '').trim().normalize('NFKC').toLowerCase();
const officialGear = new Map(
  [...GEAR_NAMES].flatMap(([en, de]) => [[normalizedName(en), { de, en }], [normalizedName(de), { de, en }]]),
);
const oldGearLabels = new Map([
  ['Battle Hardened', 'Taktikmaske'],
  ['Ghost', 'Geist'],
  ['Molotov Cocktail', 'Molotow-Cocktail'],
  ['Stim', 'Stim-Injektion'],
  ['Tracker', 'Spurensucher'],
]);
for (const [en, de] of oldGearLabels) officialGear.set(normalizedName(de), officialGear.get(normalizedName(en)));

export function equipmentNames(row, value, fallback) {
  const name = value || row?.name || '';
  const verified = officialGear.get(normalizedName(name)) || officialGear.get(normalizedName(fallback?.[0]));
  const de = row?.de?.trim();
  const en = row?.en?.trim();
  if (verified) {
    const recognized = [name, verified.en, verified.de, oldGearLabels.get(verified.en), fallback?.[0], fallback?.[1]]
      .map(normalizedName);
    return {
      de: !de || recognized.includes(normalizedName(de)) ? verified.de : de,
      en: !en || recognized.includes(normalizedName(en)) ? verified.en : en,
    };
  }
  return {
    de: de || fallback?.[1] || name || 'Keine',
    en: en || fallback?.[0] || name || 'None',
  };
}

export function attachmentNames(part) {
  const verified = !part?.custom && ATTACHMENT_NAMES.get(part?.id);
  const fallback = part?.name || part?.en || part?.de || '';
  if (!verified) return { de: part?.de || fallback, en: part?.en || fallback };
  const [oldDe, de, oldEn, en] = verified;
  return {
    de: !part.de || part.de === oldDe ? de : part.de,
    en: !part.en || part.en === oldEn ? en : part.en,
  };
}

const retiredIds = new Set([...ATTACHMENT_ALIASES.values()].flatMap((aliases) => [...aliases.keys()]));
export const isRetiredAttachment = (id) => retiredIds.has(id);

export function currentAttachmentId(weaponId, partId, assigned) {
  const canonical = ATTACHMENT_ALIASES.get(weaponId)?.get(partId);
  return canonical && assigned.has(canonical) ? canonical : partId;
}

export function distinctAttachmentIds(weaponId, ids) {
  const assigned = new Set(ids);
  return new Set([...assigned].map((id) => currentAttachmentId(weaponId, id, assigned)));
}

export function weaponAssignmentChange(weapon, availableIds) {
  const previous = new Set(weapon.attachmentIds || []);
  const added = (WEAPON_ADDITIONS.get(weapon.id) || []).filter((id) => availableIds.has(id) && !previous.has(id));
  const next = new Set([...previous, ...added]);
  const removed = [];
  for (const [older, canonical] of ATTACHMENT_ALIASES.get(weapon.id) || []) {
    if (next.has(canonical) && availableIds.has(canonical) && next.delete(older)) removed.push(older);
  }
  return { added, removed, attachmentIds: [...next] };
}
