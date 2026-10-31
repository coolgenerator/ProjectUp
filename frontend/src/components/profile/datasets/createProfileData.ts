export const schools = ["UC San Diego"];

// Categorized skill suggestions
export type SkillCategory = {
    category: string;
    skills: string[];
};

export const skillCategories: SkillCategory[] = [
    {
        category: "Programming Languages",
        skills: ["JavaScript", "Python", "Java", "C++", "TypeScript", "Go", "Rust", "PHP", "Swift", "Kotlin", "Ruby", "C#"]
    },
    {
        category: "Web Development",
        skills: ["React", "Angular", "Vue.js", "Next.js", "Node.js", "Express", "Django", "Flask", "HTML/CSS", "Tailwind CSS", "Responsive Design", "Web Accessibility", "GraphQL", "RESTful APIs"]
    },
    {
        category: "Data Science & AI",
        skills: ["Machine Learning", "Deep Learning", "Natural Language Processing", "Computer Vision", "Data Analysis", "Statistical Analysis", "TensorFlow", "PyTorch", "Scikit-learn", "Data Visualization", "Pandas", "R"]
    },
    {
        category: "Design & Creative",
        skills: ["UI/UX Design", "Graphic Design", "Figma", "Adobe Photoshop", "Adobe Illustrator", "Sketch", "Animation", "Video Editing", "3D Modeling", "Typography", "Color Theory", "Prototyping"]
    },
    {
        category: "Business & Management",
        skills: ["Project Management", "Agile/Scrum", "Product Management", "Marketing", "Business Analysis", "Public Speaking", "Leadership", "Team Management", "Strategic Planning", "Negotiation", "Sales", "Customer Relations"]
    },
    {
        category: "Mobile Development",
        skills: ["iOS Development", "Android Development", "React Native", "Flutter", "Mobile UI Design", "App Store Optimization", "Push Notifications", "Mobile Performance", "Mobile Security"]
    },
    {
        category: "DevOps & Infrastructure",
        skills: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "Git", "Linux", "Networking", "Security", "Terraform", "Ansible", "Monitoring", "Serverless"]
    },
    {
        category: "Soft Skills",
        skills: ["Communication", "Critical Thinking", "Problem Solving", "Time Management", "Adaptability", "Teamwork", "Creativity", "Emotional Intelligence", "Conflict Resolution", "Active Listening"]
    }
];

// Flattened skill suggestions for backward compatibility
export const skillSuggestions = skillCategories.flatMap(category => category.skills);

// Categorized interest suggestions
export type InterestCategory = {
    category: string;
    interests: string[];
};

export const interestCategories: InterestCategory[] = [
    {
        category: "Technology",
        interests: ["Artificial Intelligence", "Blockchain", "Cybersecurity", "Robotics", "Virtual Reality", "Augmented Reality", "Smart Home", "IoT", "Tech Startups", "Open Source", "Digital Privacy", "Quantum Computing"]
    },
    {
        category: "Science",
        interests: ["Astronomy", "Biology", "Chemistry", "Physics", "Neuroscience", "Genetics", "Climate Science", "Medicine", "Scientific Research", "Space Exploration", "Mathematics", "Biotechnology"]
    },
    {
        category: "Arts & Culture",
        interests: ["Visual Arts", "Photography", "Literature", "Poetry", "Film & Cinema", "Animation", "Music", "Theatre", "Dance", "Architecture", "Fashion", "Culinary Arts", "History", "Philosophy"]
    },
    {
        category: "Sports & Activities",
        interests: ["Football", "Basketball", "Soccer", "Tennis", "Swimming", "Cycling", "Running", "Yoga", "Martial Arts", "Hiking", "Rock Climbing", "Skiing", "Surfing", "Fitness", "Chess", "Gaming"]
    },
    {
        category: "Lifestyle",
        interests: ["Traveling", "Food & Cooking", "Gardening", "Interior Design", "Minimalism", "Sustainable Living", "DIY Projects", "Wellness", "Mindfulness", "Volunteering", "Reading", "Writing"]
    },
    {
        category: "Business & Entrepreneurship",
        interests: ["Startups", "Investing", "Marketing", "E-commerce", "FinTech", "Business Strategy", "Venture Capital", "Entrepreneurship", "Innovation", "Leadership", "Public Speaking", "Digital Nomadism"]
    },
    {
        category: "Social & Global Issues",
        interests: ["Environmental Conservation", "Social Justice", "Education", "Healthcare", "Humanitarian Aid", "Diversity & Inclusion", "Renewable Energy", "Urban Planning", "Global Politics", "Community Building"]
    }
];

// Flattened interest suggestions for backward compatibility
export const interestSuggestions = interestCategories.flatMap(category => category.interests);

export const countries = ["United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", "China", "Japan", "India", "Australia", "Brazil", "South Africa", "Italy", "Spain", "South Korea", "Russia", "Sweden", "Netherlands", "Switzerland", "Singapore"];

// Language suggestions in their native scripts
// Sorted by global popularity (most to least)
export const languageSuggestions = [
    // Top three as specified
    "English (en)",             // ~1.5 billion speakers
    "Español (es)",             // ~580 million speakers
    "中文 (zh)",                 // Mandarin Chinese, ~1.1 billion speakers

    // Other major world languages
    "हिन्दी (hi)",               // Hindi, ~600 million speakers
    "العربية (ar)",             // Arabic, ~420 million speakers
    "Français (fr)",            // French, ~280 million speakers
    "Русский (ru)",             // Russian, ~260 million speakers
    "Português (pt)",           // Portuguese, ~260 million speakers
    "বাংলা (bn)",                // Bengali, ~270 million speakers
    "اردو (ur)",                 // Urdu, ~230 million speakers
    "日本語 (ja)",                // Japanese, ~125 million speakers
    "Deutsch (de)",             // German, ~130 million speakers

    // Medium spread languages
    "한국어 (ko)",                // Korean, ~80 million speakers
    "Tiếng Việt (vi)",          // Vietnamese, ~80 million speakers
    "Italiano (it)",            // Italian, ~65 million speakers
    "Türkçe (tr)",              // Turkish, ~80 million speakers
    "ไทย (th)",                  // Thai, ~60 million speakers
    "தமிழ் (ta)",                // Tamil, ~75 million speakers
    "ગુજરાતી (gu)",              // Gujarati, ~55 million speakers
    "मराठी (mr)",                // Marathi, ~83 million speakers
    "Bahasa Indonesia (id)",    // Indonesian, ~200 million speakers
    "Bahasa Melayu (ms)",       // Malay, ~77 million speakers
    "తెలుగు (te)",               // Telugu, ~82 million speakers

    // Other languages
    "Polski (pl)",              // Polish, ~50 million speakers
    "Українська (uk)",          // Ukrainian, ~40 million speakers
    "Nederlands (nl)",          // Dutch, ~30 million speakers
    "ਪੰਜਾਬੀ (pa)",               // Punjabi, ~125 million speakers
    "ಕನ್ನಡ (kn)",                // Kannada, ~45 million speakers
    "മലയാളം (ml)",              // Malayalam, ~38 million speakers
    "Tagalog (tl)",             // Tagalog/Filipino, ~70 million speakers
    "ខ្មែរ (km)",                 // Khmer, ~16 million speakers
    "Ελληνικά (el)",            // Greek, ~13 million speakers
    "Svenska (sv)",             // Swedish, ~10 million speakers
    "עברית (he)",               // Hebrew, ~9 million speakers
    "Norsk (no)",               // Norwegian, ~5 million speakers
    "Suomi (fi)",               // Finnish, ~5 million speakers
    "Dansk (da)",               // Danish, ~6 million speakers
];

export const fieldOfStudySuggestions = [
    "Computer Science",
    "Biology",
    "Data Science",
    "Design",
    "Physics",
    "Engineering",
    "Mathematics",
    "Business",
    "Economics",
    "Psychology",
    "Chemistry",
    "Art",
    "History",
    "Law",
];

export const dicebearStyles = [
    "adventurer",
    "adventurer-neutral",
    "avataaars",
    "big-ears",
    "big-ears-neutral",
    "big-smile",
    "bottts",
    "croodles",
    "croodles-neutral",
    "fun-emoji",
    "icons",
    "identicon",
    "initials",
    "lorelei",
    "micah",
    "miniavs",
    "open-peeps",
    "personas",
    "pixel-art",
    "pixel-art-neutral",
];