export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  lists: string[];
  icon: string;
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "engineering",
    name: "Engineering Sprint",
    description: "Agile sprint board for software teams",
    lists: ["Backlog", "To Do", "In Progress", "In Review", "Done"],
    icon: "code",
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Plan and track marketing campaigns",
    lists: ["Ideas", "Planning", "In Progress", "Review", "Published"],
    icon: "megaphone",
  },
  {
    id: "product",
    name: "Product Launch",
    description: "Coordinate product launch activities",
    lists: ["Research", "Design", "Development", "Testing", "Launch"],
    icon: "rocket",
  },
  {
    id: "hiring",
    name: "Hiring Pipeline",
    description: "Track candidates through hiring stages",
    lists: ["Applied", "Phone Screen", "Interview", "Offer", "Hired"],
    icon: "users",
  },
  {
    id: "blank",
    name: "Blank Board",
    description: "Start from scratch with default lists",
    lists: ["To Do", "In Progress", "Done"],
    icon: "plus",
  },
];
