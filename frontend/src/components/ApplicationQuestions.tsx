import React from "react";
import { Question } from "../types/project/postDetails";

interface ApplicationQuestionsProps {
    questions: Question[];
    setQuestions: (updatedQuestions: Question[]) => void;
}

const ApplicationQuestions: React.FC<ApplicationQuestionsProps> = ({ questions, setQuestions }) => {
    const handleAddQuestion = () => {
        const updatedQuestions = [
            ...questions,
            { type: 0, text: "", choices: [] }, // Default to text (0), with options in [ text(0), multi-choice(1) ]
        ];
        setQuestions(updatedQuestions);
    };

    const handleRemoveQuestion = (index: number) => {
        const updatedQuestions = questions.filter((_, i) => i !== index);
        setQuestions(updatedQuestions);
    };

    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
        setQuestions(updatedQuestions);
    };

    const handleAddChoice = (index: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index].choices.push("");
        setQuestions(updatedQuestions);
    };

    const handleChoiceChange = (qIndex: number, cIndex: number, value: string) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices[cIndex] = value;
        setQuestions(updatedQuestions);
    };

    const handleRemoveChoice = (qIndex: number, cIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices = updatedQuestions[qIndex].choices.filter((_, i) => i !== cIndex);
        setQuestions(updatedQuestions);
    };

    return (
        <div>
            <label className="block mb-2 font-bold">Application Questions</label>
            {questions.map((q, index) => (
                <div key={index} className="mb-4 border p-4 rounded">
                    <div className="mb-2">
                        <label className="block mb-1 font-semibold">Question Type</label>
                        <select
                            value={q.type}
                            onChange={(e) => handleQuestionChange(index, "type", Number(e.target.value))}
                            className="w-full p-2 border rounded"
                        >
                            <option value={0}>Open-ended</option>
                            <option value={1}>Multiple Choice</option>
                        </select>
                    </div>

                    <input
                        type="text"
                        placeholder="Question Text"
                        value={q.text}
                        onChange={(e) => handleQuestionChange(index, "text", e.target.value)}
                        className="w-full p-2 border rounded mb-2"
                    />

                    {q.type === 1 && (
                        <div>
                            <label className="block mb-1 font-semibold">Options</label>
                            {q.choices.map((choice, choiceIndex) => (
                                <div key={choiceIndex} className="flex items-center mb-2">
                                    <input
                                        type="text"
                                        value={choice}
                                        onChange={(e) =>
                                            handleChoiceChange(index, choiceIndex, e.target.value)
                                        }
                                        className="w-full p-2 border rounded"
                                    />
                                    <button
                                        onClick={() => handleRemoveChoice(index, choiceIndex)}
                                        className="ml-2 text-red-500 hover:text-red-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => handleAddChoice(index)}
                                className="text-blue-500 hover:text-blue-700"
                            >
                                + Add Option
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => handleRemoveQuestion(index)}
                        className="mt-2 text-red-500 hover:text-red-700"
                    >
                        Remove Question
                    </button>
                </div>
            ))}

            <button
                onClick={handleAddQuestion}
                className="text-blue-500 hover:text-blue-700"
            >
                + Add Question
            </button>
        </div>
    );
};

export default ApplicationQuestions;
