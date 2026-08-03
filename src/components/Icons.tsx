import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Clapperboard,
  Compass,
  Eye,
  EyeOff,
  FerrisWheel,
  Footprints,
  Landmark,
  Languages,
  List,
  Map as MapIcon,
  MapPinned,
  PawPrint,
  RefreshCw,
  ShoppingBag,
  SkipForward,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Trees,
  Utensils,
  Wrench,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { PlaceKind, VenueKind } from "@/lib/types";

const kindIcons: Record<VenueKind, LucideIcon> = {
  theme_park: FerrisWheel,
  museum: Landmark,
  zoo: PawPrint,
  historic: Landmark,
  other: Trees,
};

const placeKindIcons: Record<PlaceKind, LucideIcon> = {
  ride: FerrisWheel,
  show: Clapperboard,
  restaurant: Utensils,
  shop: ShoppingBag,
  service: Wrench,
  exhibit: Landmark,
  other: MapPinned,
};

export function VenueKindIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: VenueKind;
  className?: string;
}) {
  const Icon = kindIcons[kind] ?? Trees;
  return <Icon className={className} aria-hidden />;
}

export function PlaceKindIcon({
  kind,
  className = "h-4 w-4",
}: {
  kind: PlaceKind;
  className?: string;
}) {
  const Icon = placeKindIcons[kind] ?? MapPinned;
  return <Icon className={className} aria-hidden />;
}

export function CategoryIcon({
  category,
  placeKind,
  className = "h-4 w-4",
}: {
  category: string;
  placeKind?: PlaceKind;
  className?: string;
}) {
  if (placeKind) return <PlaceKindIcon kind={placeKind} className={className} />;
  const value = category.toLowerCase();
  let Icon: LucideIcon = MapPinned;
  if (value.includes("restaurant") || value.includes("cafe") || value.includes("food"))
    Icon = Utensils;
  else if (value.includes("shop") || value.includes("gift")) Icon = ShoppingBag;
  else if (value.includes("toilet") || value.includes("service") || value.includes("atm"))
    Icon = Wrench;
  else if (value.includes("show") || value.includes("theatre") || value.includes("cinema"))
    Icon = Clapperboard;
  else if (value.includes("museum") || value.includes("gallery") || value.includes("artwork"))
    Icon = Landmark;
  else if (value.includes("zoo") || value.includes("aquarium")) Icon = PawPrint;
  else if (
    value.includes("attraction") ||
    value.includes("roller") ||
    value.includes("coaster") ||
    value.includes("theme") ||
    value.includes("ride")
  )
    Icon = FerrisWheel;
  else if (value.includes("park") || value.includes("garden")) Icon = Trees;
  return <Icon className={className} aria-hidden />;
}

export const UiIcons = {
  list: List,
  map: MapIcon,
  mapPinned: MapPinned,
  check: Check,
  skip: SkipForward,
  star: Star,
  eye: Eye,
  eyeOff: EyeOff,
  up: ArrowUp,
  down: ArrowDown,
  right: ArrowRight,
  wifi: Wifi,
  wifiOff: WifiOff,
  language: Languages,
  sparkles: Sparkles,
  compass: Compass,
  footprints: Footprints,
  utensils: Utensils,
  phone: Smartphone,
  refresh: RefreshCw,
  trash: Trash2,
};
