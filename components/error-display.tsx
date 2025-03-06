import React from "react";
import { Link } from "@tanstack/react-router";

interface ErrorDisplayProps {
  title: string;
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{title}</h1>
        <p className="text-gray-700 mb-6">{message}</p>
        <Link
          from="/chat/$subjectId/$moduleId"
          to="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};
