// Central Phosphor Icons library for NexusHire
// Exporting canonical Phosphor icon names and compatibility aliases
export {
  // Navigation & Core UI
  House,
  House as Home,
  SquaresFour,
  SquaresFour as LayoutGrid,
  CalendarBlank,
  CalendarBlank as Calendar,
  CalendarDots,
  CalendarDots as CalendarDays,
  Timer,
  Timer as CalendarClock,
  Clock,
  Briefcase,
  Buildings,
  Buildings as Building2,
  Storefront,
  Storefront as Store,
  Key,
  Key as KeyRound,
  SignOut,
  SignOut as LogOut,
  ShieldCheck,

  // Users & Profiles
  User,
  UserCircle,
  Users,

  // Search & Actions
  MagnifyingGlass,
  MagnifyingGlass as Search,
  MagnifyingGlassPlus,
  MagnifyingGlassPlus as ZoomIn,
  Plus,
  X,
  XCircle,
  PencilSimple,
  PencilSimple as Pencil,
  Trash,
  Trash as Trash2,
  Power,
  Gear,
  Gear as Settings,

  // Arrows & Chevrons
  CaretRight,
  CaretRight as ChevronRight,
  CaretLeft,
  CaretLeft as ChevronLeft,
  CaretDown,
  CaretDown as ChevronDown,
  CaretUp,
  CaretUp as ChevronUp,
  ArrowRight,
  ArrowLeft,
  ArrowCircleDown,
  ArrowCircleDown as ArrowDownCircle,
  ArrowSquareOut,
  ArrowSquareOut as ExternalLink,

  // Upload & Files
  UploadSimple,
  UploadSimple as Upload,
  CloudArrowUp,
  CloudArrowUp as UploadCloud,
  File,
  File as FileIcon,
  FileText,
  TreeStructure,
  TreeStructure as FolderTree,
  ClipboardText,
  ClipboardText as ClipboardList,
  Image,
  Image as ImagePlus,

  // Chat & Communication
  ChatText,
  ChatText as MessageSquare,
  ChatsCircle,
  ChatsCircle as MessagesSquare,
  PaperPlaneTilt,
  PaperPlaneTilt as Send,
  Robot,
  Robot as Bot,
  Envelope,
  Envelope as Mail,
  Phone,
  MapPin,
  Megaphone,

  // Status & Feedback
  Check,
  CheckCircle,
  CheckCircle as CheckCircle2,
  WarningCircle,
  WarningCircle as AlertCircle,
  Warning,
  Warning as AlertTriangle,
  CircleNotch,
  CircleNotch as Loader2,
  CheckSquare,
  CheckSquare as SquareCheck,
  Square,
  Star,
  Eye,
  EyeSlash,
  EyeSlash as EyeOff,

  // Domain & Utility
  Code,
  Stethoscope,
  DotsSixVertical,
  DotsSixVertical as GripVertical,
  Sun,
  Moon,
  Question,
  ArrowUpRight,
  ArrowsClockwise,
  ListBullets,
  GridFour,
  Sparkle,
  MagicWand,
  Bell,
  SlidersHorizontal,
} from '@phosphor-icons/react/ssr'

export type { Icon, IconProps, IconWeight } from '@phosphor-icons/react'
export type { Icon as LucideIcon } from '@phosphor-icons/react'

import * as React from 'react'
import type { Icon, IconProps } from '@phosphor-icons/react'

export const Age: Icon = React.forwardRef<SVGSVGElement, IconProps>(function Age(
  { size = '1em', weight = 'regular', color = 'currentColor', className, mirrored, ...props },
  ref
) {
  const strokeWidth = weight === 'bold' || weight === 'fill' ? 20 : weight === 'light' ? 12 : weight === 'thin' ? 8 : 16

  return (
    <svg
      ref={ref}
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      className={className}
      transform={mirrored ? 'scale(-1, 1)' : undefined}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Adult */}
      <circle cx="191" cy="49" r="21" fill={color} stroke="none" />
      <rect
        x="152"
        y="88"
        width="78"
        height="87"
        rx="32"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={weight === 'fill' ? color : 'none'}
      />
      <line x1="173" y1="176" x2="173" y2="231" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="210" y1="176" x2="210" y2="231" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Youth */}
      <circle cx="127" cy="82" r="21" fill={color} stroke="none" />
      <path
        d="M 132 114 C 99 121, 95 146, 95 164 C 95 183, 113 190, 120 194 L 120 231"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Child */}
      <circle cx="67" cy="109" r="19" fill={color} stroke="none" />
      <path
        d="M 72 141 C 40 148, 35 171, 35 185 C 35 199, 51 203, 58 208 L 58 231"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}) as unknown as Icon

export const AgeIcon = Age

export const Experience: Icon = React.forwardRef<SVGSVGElement, IconProps>(function Experience(
  { size = '1em', weight = 'regular', color = 'currentColor', className, mirrored, ...props },
  ref
) {
  const strokeWidth = weight === 'bold' || weight === 'fill' ? 18 : weight === 'light' ? 12 : weight === 'thin' ? 8 : 16

  return (
    <svg
      ref={ref}
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      className={className}
      transform={mirrored ? 'scale(-1, 1)' : undefined}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 3 Stars above candidate head (Experience rating) */}
      {/* Center Top Star */}
      <path
        d="M 128 31 L 135.1 49.3 L 154.6 50.3 L 139.4 62.6 L 144.5 81.4 L 128 70.8 L 111.5 81.4 L 116.6 62.6 L 101.4 50.3 L 120.9 49.3 Z"
        fill={color}
        stroke="none"
      />
      {/* Left Star */}
      <path
        d="M 58.5 62.5 L 65.6 80.8 L 85.1 81.8 L 69.9 94.1 L 75 112.9 L 58.5 102.3 L 42 112.9 L 47.1 94.1 L 31.9 81.8 L 51.4 80.8 Z"
        fill={color}
        stroke="none"
      />
      {/* Right Star */}
      <path
        d="M 197.5 62.5 L 204.6 80.8 L 224.1 81.8 L 208.9 94.1 L 214 112.9 L 197.5 102.3 L 181 112.9 L 186.1 94.1 L 170.9 81.8 L 190.4 80.8 Z"
        fill={color}
        stroke="none"
      />

      {/* Candidate Head */}
      <circle cx="128" cy="126" r="30" fill={color} stroke="none" />

      {/* Candidate Shoulders / Bust */}
      <path
        d="M 128 170 C 104 170 80 187 80 213 C 80 220.5 84.5 224 91 224 L 165 224 C 171.5 224 176 220.5 176 213 C 176 187 152 170 128 170 Z"
        fill={weight === 'fill' ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}) as unknown as Icon

export const ExperienceIcon = Experience

export const Jobs: Icon = React.forwardRef<SVGSVGElement, IconProps>(function Jobs(
  { size = '1em', weight = 'regular', color = 'currentColor', className, mirrored, ...props },
  ref
) {
  const strokeWidth = weight === 'bold' || weight === 'fill' ? 18 : weight === 'light' ? 12 : weight === 'thin' ? 8 : 16

  if (weight === 'fill') {
    return (
      <svg
        ref={ref}
        viewBox="0 0 256 256"
        width={size}
        height={size}
        fill={color}
        stroke={color}
        className={className}
        transform={mirrored ? 'scale(-1, 1)' : undefined}
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Handle */}
        <path
          d="M 94 68 C 94 40 108 30 128 30 C 148 30 162 40 162 68"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Top Half / Flap */}
        <path
          d="M 32 104 C 32 82 46 68 68 68 L 188 68 C 210 68 224 82 224 104 L 224 128 L 32 128 Z"
          fill={color}
          stroke="none"
        />
        {/* Bottom Compartment with Center Clasp */}
        <path
          d="M 32 144 L 118 144 L 118 162 C 118 167 122 170 128 170 C 134 170 138 167 138 162 L 138 144 L 224 144 L 224 188 C 224 210 210 224 188 224 L 68 224 C 46 224 32 210 32 188 Z"
          fill={color}
          stroke="none"
        />
      </svg>
    )
  }

  return (
    <svg
      ref={ref}
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      className={className}
      transform={mirrored ? 'scale(-1, 1)' : undefined}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Handle */}
      <path
        d="M 94 68 C 94 40 108 30 128 30 C 148 30 162 40 162 68"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bag Body */}
      <rect
        x="32"
        y="68"
        width="192"
        height="156"
        rx="36"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Divider */}
      <line
        x1="32"
        y1="136"
        x2="224"
        y2="136"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Center Latch */}
      <line
        x1="128"
        y1="136"
        x2="128"
        y2="154"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}) as unknown as Icon

export const JobsIcon = Jobs

export const Branches: Icon = React.forwardRef<SVGSVGElement, IconProps>(function Branches(
  { size = '1em', weight = 'regular', color = 'currentColor', className, mirrored, ...props },
  ref
) {
  const strokeWidth = weight === 'bold' || weight === 'fill' ? 18 : weight === 'light' ? 12 : weight === 'thin' ? 8 : 16

  if (weight === 'fill') {
    return (
      <svg
        ref={ref}
        viewBox="0 0 256 256"
        width={size}
        height={size}
        fill={color}
        stroke={color}
        className={className}
        transform={mirrored ? 'scale(-1, 1)' : undefined}
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Top branch curve */}
        <path
          d="M 128 128 V 96 A 32 32 0 0 1 160 64 H 170"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bottom branch curve */}
        <path
          d="M 128 128 V 160 A 32 32 0 0 0 160 192 H 170"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Main trunk */}
        <line
          x1="86"
          y1="128"
          x2="170"
          y2="128"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Solid filled node circles */}
        <circle cx="64" cy="128" r="28" fill={color} stroke="none" />
        <circle cx="192" cy="64" r="28" fill={color} stroke="none" />
        <circle cx="192" cy="128" r="28" fill={color} stroke="none" />
        <circle cx="192" cy="192" r="28" fill={color} stroke="none" />
      </svg>
    )
  }

  return (
    <svg
      ref={ref}
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      className={className}
      transform={mirrored ? 'scale(-1, 1)' : undefined}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Top branch curve */}
      <path
        d="M 128 128 V 96 A 32 32 0 0 1 160 64 H 170"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom branch curve */}
      <path
        d="M 128 128 V 160 A 32 32 0 0 0 160 192 H 170"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main trunk */}
      <line
        x1="86"
        y1="128"
        x2="170"
        y2="128"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Hollow node rings */}
      <circle cx="64" cy="128" r="22" strokeWidth={strokeWidth} />
      <circle cx="192" cy="64" r="22" strokeWidth={strokeWidth} />
      <circle cx="192" cy="128" r="22" strokeWidth={strokeWidth} />
      <circle cx="192" cy="192" r="22" strokeWidth={strokeWidth} />
    </svg>
  )
}) as unknown as Icon

export const BranchesIcon = Branches
