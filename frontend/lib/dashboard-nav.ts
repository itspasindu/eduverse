import type { AppRole } from "@/lib/roles";

/** Authenticated app home — community feed (Instagram-style). */
export const COMMUNITY_HOME = "/dashboard";

export type NavLink = {
  href: string;
  label: string;
  icon: string;
};

const studentLinks: NavLink[] = [
  { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
  { href: "/dashboard/overview", label: "Overview", icon: "📊" },
  { href: "/dashboard/slides", label: "Slide Studio", icon: "📽️" },
  { href: "/dashboard/meme", label: "Meme Studio", icon: "🎨" },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: "🎓" },
<<<<<<< HEAD
=======
  { href: "/dashboard/characters", label: "Characters", icon: "🦊" },
  { href: "/dashboard/lesson-studio", label: "Lesson Studio", icon: "🎬" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
>>>>>>> 140e298 (Save local progress)
  { href: "/dashboard/announcements", label: "Class Updates", icon: "📢" },
  { href: "/dashboard/library", label: "My Library", icon: "📚" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const creatorLinks: NavLink[] = [
  { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
  { href: "/dashboard/overview", label: "Overview", icon: "📊" },
  { href: "/dashboard/slides", label: "Slide Studio", icon: "📽️" },
  { href: "/dashboard/meme", label: "Meme Studio", icon: "🎨" },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: "🎓" },
<<<<<<< HEAD
=======
  { href: "/dashboard/characters", label: "Characters", icon: "🦊" },
  { href: "/dashboard/lesson-studio", label: "Lesson Studio", icon: "🎬" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
>>>>>>> 140e298 (Save local progress)
  { href: "/dashboard/library", label: "My Library", icon: "📚" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const teacherLinks: NavLink[] = [
  { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
  { href: "/dashboard/teacher", label: "Teacher panel", icon: "🏫" },
  { href: "/dashboard/slides", label: "Slide Studio", icon: "📽️" },
  { href: "/dashboard/teacher/students", label: "Students", icon: "👥" },
  { href: "/dashboard/teacher/announcements", label: "Announcements", icon: "📢" },
  { href: "/dashboard/characters", label: "Class Mascots", icon: "🦊" },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: "🎓" },
<<<<<<< HEAD
=======
  { href: "/dashboard/lesson-studio", label: "Lesson Studio", icon: "🎬" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
>>>>>>> 140e298 (Save local progress)
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const adminLinks: NavLink[] = [
  { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
  { href: "/dashboard/admin", label: "Admin panel", icon: "🛡️" },
  { href: "/dashboard/slides", label: "Slide Studio", icon: "📽️" },
  { href: "/dashboard/admin/users", label: "Users", icon: "👤" },
  { href: "/dashboard/admin/subscriptions", label: "Subscriptions", icon: "💳" },
  { href: "/dashboard/admin/moderation", label: "Moderation", icon: "🧹" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export function navLinksForRole(role: AppRole): NavLink[] {
  if (role === "admin") return adminLinks;
  if (role === "teacher") return teacherLinks;
  if (role === "creator") return creatorLinks;
  return studentLinks;
}

export function mobileLinksForRole(role: AppRole): NavLink[] {
  if (role === "admin") {
    return [
      { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
      { href: "/dashboard/admin", label: "Admin", icon: "🛡️" },
<<<<<<< HEAD
      { href: "/dashboard/meme", label: "Create", icon: "➕" },
      { href: "/dashboard/settings", label: "Profile", icon: "👤" },
=======
      { href: "/dashboard/admin/users", label: "Users", icon: "👤" },
      { href: "/dashboard/admin/subscriptions", label: "Plans", icon: "💳" },
      { href: "/dashboard/admin/moderation", label: "Mod", icon: "🧹" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
>>>>>>> 44a09b9 (Added new files)
    ];
  }
  if (role === "teacher") {
    return [
      { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
      { href: "/dashboard/teacher", label: "Teach", icon: "🏫" },
      { href: "/dashboard/meme", label: "Create", icon: "➕" },
      { href: "/dashboard/settings", label: "Profile", icon: "👤" },
    ];
  }
  if (role === "creator") {
    return [
      { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
      { href: "/dashboard/meme", label: "Create", icon: "➕" },
      { href: "/dashboard/slides", label: "Slides", icon: "📽️" },
      { href: "/dashboard/settings", label: "Profile", icon: "👤" },
    ];
  }
  return [
    { href: COMMUNITY_HOME, label: "Home", icon: "🏠" },
    { href: "/dashboard/meme", label: "Create", icon: "➕" },
    { href: "/dashboard/tutor", label: "Tutor", icon: "🎓" },
<<<<<<< HEAD
    { href: "/dashboard/settings", label: "Profile", icon: "👤" },
=======
    { href: "/dashboard/lesson-studio", label: "Lessons", icon: "🎬" },
    { href: "/dashboard/announcements", label: "Class", icon: "📢" },
>>>>>>> 140e298 (Save local progress)
  ];
}
