export type Workout = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  level: string;
  image_url: string | null;
  video_url: string | null;
  video_type: "youtube" | "upload" | null;
  duration_min: number;
  calories: number | null;
  equipment: string | null;
  instructions: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type WorkoutSection = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type WorkoutSectionLink = {
  workout_id: string;
  section_id: string;
};
