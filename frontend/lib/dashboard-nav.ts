import type { AppRole } from "@/lib/roles";

export type NavLink = {
  href: string;
  label: string;
  icon: string;
};

const studentLinks: NavLink[] = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/meme", label: "Meme Studio", icon: "🎨" },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: "🎓" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
  { href: "/dashboard/announcements", label: "Class Updates", icon: "📢" },
  { href: "/dashboard/library", label: "My Library", icon: "📚" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const creatorLinks: NavLink[] = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/slides", label: "Slide Studio", icon: "📽️" },
  { href: "/dashboard/meme", label: "Meme Studio", icon: "🎨" },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: "🎓" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
  { href: "/dashboard/library", label: "My Library", icon: "📚" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const teacherLinks: NavLink[] = [
  { href: "/dashboard/teacher", label: "Teacher Home", icon: "🏫" },
  { href: "/dashboard/teacher/students", label: "Students", icon: "👥" },
  { href: "/dashboard/teacher/announcements", label: "Announcements", icon: "📢" },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: "🎓" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const adminLinks: NavLink[] = [
  { href: "/dashboard/admin", label: "Admin Home", icon: "🛡️" },
  { href: "/dashboard/admin/users", label: "Users", icon: "👤" },
  { href: "/dashboard/admin/moderation", label: "Moderation", icon: "🧹" },
  { href: "/dashboard/feed", label: "Community Feed", icon: "🌐" },
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
      { href: "/dashboard/admin", label: "Admin", icon: "🛡️" },
      { href: "/dashboard/admin/users", label: "Users", icon: "👤" },
      { href: "/dashboard/admin/moderation", label: "Mod", icon: "🧹" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
    ];
  }
  if (role === "teacher") {
    return [
      { href: "/dashboard/teacher", label: "Home", icon: "🏫" },
      { href: "/dashboard/teacher/students", label: "Students", icon: "👥" },
      { href: "/dashboard/teacher/announcements", label: "News", icon: "📢" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
    ];
  }
  if (role === "creator") {
    return [
      { href: "/dashboard", label: "Home", icon: "📊" },
      { href: "/dashboard/slides", label: "Slides", icon: "📽️" },
      { href: "/dashboard/meme", label: "Meme", icon: "🎨" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
    ];
  }
  return [
    { href: "/dashboard", label: "Home", icon: "📊" },
    { href: "/dashboard/meme", label: "Meme", icon: "🎨" },
    { href: "/dashboard/tutor", label: "Tutor", icon: "🎓" },
    { href: "/dashboard/announcements", label: "Class", icon: "📢" },
  ];
}
