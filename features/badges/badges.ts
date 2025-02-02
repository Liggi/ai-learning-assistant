interface Badge {
  name: string;
  description: string;
  level: "Bronze" | "Silver" | "Gold" | "Platinum";
}

// React Hooks Badges
const reactHooksBadges: Badge[] = [
  {
    name: "Effect and Cause",
    description:
      "Successfully navigated the counterintuitive world of useEffect's cleanup patterns - you've seen both sides of the effect.",
    level: "Gold",
  },
  {
    name: "Memoized and Confused",
    description:
      "Wrestled with useMemo and useCallback, questioning everything about performance optimization - but emerged victorious.",
    level: "Silver",
  },
  {
    name: "Custom Hook Line and Sinker",
    description:
      "Mastered the art of custom hooks, turning complex logic into elegant, reusable abstractions.",
    level: "Platinum",
  },
  {
    name: "State of Mind",
    description:
      "Achieved enlightenment about React's useState, understanding when local state is the perfect tool for the job.",
    level: "Bronze",
  },
  {
    name: "Context Conquistador",
    description:
      "Conquered the Context API, knowing exactly when to use it and - more importantly - when not to.",
    level: "Gold",
  },
];

// Component Lifecycle Badges
const componentBadges: Badge[] = [
  {
    name: "Mount Everest",
    description:
      "Scaled the heights of component mounting, understanding the journey from creation to DOM.",
    level: "Bronze",
  },
  {
    name: "Update in Progress",
    description:
      "Mastered the subtle art of component updates, knowing exactly when and why your component re-renders.",
    level: "Silver",
  },
  {
    name: "Clean Sweep",
    description:
      "Became a cleanup virtuoso, ensuring your components leave no trace when they bid farewell.",
    level: "Gold",
  },
];

// Performance Badges
const performanceBadges: Badge[] = [
  {
    name: "Render Bender",
    description:
      "Bent the rules of rendering to your will, optimizing performance without sacrificing readability.",
    level: "Platinum",
  },
  {
    name: "Bundle Buddha",
    description:
      "Achieved code-splitting enlightenment, making your app load faster than a caffeinated developer's typing speed.",
    level: "Gold",
  },
];

const badgesByModule: Record<string, Badge[]> = {
  "React Hooks": reactHooksBadges,
  "Component Lifecycle": componentBadges,
  Performance: performanceBadges,
};

export const getBadgesForModule = (moduleName: string): Badge[] => {
  return badgesByModule[moduleName] || [];
};

export type { Badge };
