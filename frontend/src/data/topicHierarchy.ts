export interface TopicCategory {
    name: string;
    subcategories: string[];
}

export const topicHierarchy: TopicCategory[] = [
    {
        name: "Technology",
        subcategories: [
            "Artificial Intelligence",
            "Machine Learning",
            "Data Science",
            "Cloud Computing",
            "Cybersecurity",
            "Internet of Things",
            "Blockchain",
            "Quantum Computing",
            "Robotics",
            "Software Development"
        ]
    },
    {
        name: "Business",
        subcategories: [
            "Entrepreneurship",
            "Marketing",
            "Finance",
            "E-commerce",
            "Supply Chain",
            "Business Analytics",
            "Project Management",
            "Consulting",
            "Digital Transformation",
            "Innovation"
        ]
    },
    {
        name: "Science",
        subcategories: [
            "Biology",
            "Chemistry",
            "Physics",
            "Environmental Science",
            "Astronomy",
            "Neuroscience",
            "Genetics",
            "Ecology",
            "Climate Science",
            "Materials Science"
        ]
    },
    {
        name: "Social Impact",
        subcategories: [
            "Education",
            "Healthcare",
            "Sustainability",
            "Social Justice",
            "Community Development",
            "Public Policy",
            "Non-profit",
            "Human Rights",
            "Environmental Protection",
            "Urban Planning"
        ]
    },
    {
        name: "Arts & Design",
        subcategories: [
            "Graphic Design",
            "UI/UX Design",
            "Industrial Design",
            "Architecture",
            "Digital Art",
            "Animation",
            "Game Design",
            "Fashion Design",
            "Interior Design",
            "Visual Communication"
        ]
    },
    {
        name: "Education",
        subcategories: [
            "E-learning",
            "Educational Technology",
            "Curriculum Development",
            "Special Education",
            "Language Learning",
            "STEM Education",
            "Adult Education",
            "Educational Research",
            "Assessment & Evaluation",
            "Teacher Training"
        ]
    }
]; 