// Audience choices guide discovery; they never assign account permissions.
export const AUDIENCE_PATHWAYS = [
  { id: "children", label: "Children", description: "Read children's stories with a trusted adult, try riddles and practise beginner lessons.", links: [["Children's stories", "/explore?subject=Children%27s+stories"], ["Riddles", "/dashboard?module=riddles"], ["Lessons & games", "/learn"]] },
  { id: "youth", label: "Youth", description: "Build language skills through games, conversation and cultural stories.", links: [["Games", "/learn?section=game"], ["Language tutor", "/tutor"], ["Folktales", "/dashboard?module=folktales"]] },
  { id: "adults", label: "Adults", description: "Learn at your own pace and reconnect with language and living traditions.", links: [["Learning centre", "/learn"], ["Dictionary", "/dashboard?module=dictionary"], ["Cultural calendar", "/learn?section=event"]] },
  { id: "schools", label: "Schools", description: "Find lessons, teacher notes and classroom activities. Follow published pathways at your own pace.", links: [["Learning pathways", "/courses"], ["Learning centre", "/learn"], ["Children's stories", "/explore?subject=Children%27s+stories"]] },
  { id: "universities", label: "Universities", description: "Explore teaching resources and curated research with access appropriate to your assigned role.", links: [["Research portal", "/research"], ["Courses", "/courses"], ["Oral histories", "/dashboard?module=oral_histories"]] },
  { id: "researchers", label: "Researchers", description: "Discover publications, reports, transcripts and datasets. Restricted exports require assigned research access.", links: [["Research portal", "/research"], ["Cultural connections", "/knowledge"], ["Oral histories", "/dashboard?module=oral_histories"]] },
  { id: "institutions", label: "Cultural institutions", description: "Explore traditions, contribute authorized material and preserve community knowledge through review.", links: [["Cultural subjects", "/explore#subjects"], ["Contribute", "/contribute"], ["Cultural calendar", "/learn?section=event"]] },
  { id: "museums", label: "Museums", description: "Discover artifacts, museum locations and available models, and contribute documented collections.", links: [["Artifacts library", "/dashboard?module=artifacts"], ["Heritage sites", "/dashboard?module=heritage_sites"], ["Contribute artifacts", "/contribute/artifacts"]] },
  { id: "tourists", label: "Tourists", description: "Explore heritage places, available visitor information and useful words before a visit.", links: [["Cultural places map", "/places"], ["Heritage sites", "/dashboard?module=heritage_sites"], ["Dictionary", "/dashboard?module=dictionary"]] },
  { id: "diaspora", label: "Diaspora communities", description: "Reconnect through stories, songs and language practice; save permitted material for offline learning.", links: [["Traditional songs", "/dashboard?module=songs"], ["Language tutor", "/tutor"], ["Saved items", "/saved"]] },
  { id: "linguists", label: "Linguists", description: "Study vocabulary, grammar metadata and approved transcripts with their source context.", links: [["Dictionary", "/dashboard?module=dictionary"], ["Research portal", "/research"], ["Cultural connections", "/knowledge"]] },
  { id: "ai-researchers", label: "AI researchers", description: "Find consented datasets and model documentation. Dataset use and export remain subject to assigned access and source rights.", links: [["Research datasets & models", "/research"], ["AI media tools", "/ai-tools"], ["Cultural connections", "/knowledge"]] },
  { id: "agencies", label: "Government cultural agencies", description: "Explore documented heritage and research reports, and contribute authorized preservation records.", links: [["Research reports", "/research"], ["Heritage map", "/places"], ["Contribute", "/contribute"]] },
] as const;

export const MODULE_DIRECTORY = [
  ["Dholuo Dictionary", "/dashboard?module=dictionary"], ["Proverbs Repository", "/dashboard?module=proverbs"],
  ["Oral History Archive", "/dashboard?module=oral_histories"], ["Folktales (Sigana)", "/dashboard?module=folktales"],
  ["Traditional Songs", "/dashboard?module=songs"], ["Riddles (Ngeche)", "/dashboard?module=riddles"],
  ["Cultural Artifacts Library", "/dashboard?module=artifacts"], ["Heritage Sites", "/dashboard?module=heritage_sites"],
  ["AI Language Tutor", "/tutor"], ["CULTURAL HERITAGE", "/chatbot"], ["Games and Gamification", "/learn?section=game"],
  ["Learning Centre", "/learn?section=lesson"], ["Cultural Calendar", "/learn?section=event"],
  ["Audio-Visual Library", "/dashboard?module=audio_visual"], ["Research Portal", "/research"],
] as const;
