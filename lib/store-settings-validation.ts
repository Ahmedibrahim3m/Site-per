/** Shared, browser-safe validation used before save and enforced by the API. */
export type StoreSettings = {
  shippingPolicy: string; returnsPolicy: string; privacyPolicy: string;
  heroImageUrl: string; storyImageUrl: string; heroPositionX:number;heroPositionY:number;storyPositionX:number;storyPositionY:number; instagramUrl: string; facebookUrl: string; tiktokUrl: string;
  brandName: string; whatsappNumber: string; walletNumber: string;
  instapayAddress: string; shippingFee: number; freeShippingThreshold: number;
  heroTagline: string; heroDescription: string; storyHeadline: string; storyDescription: string;
  heroTaglineAr:string; heroDescriptionAr:string; storyHeadlineAr:string; storyDescriptionAr:string; shippingPolicyAr:string; returnsPolicyAr:string; privacyPolicyAr:string;
};
export type SettingsField = keyof StoreSettings;
export type SettingsErrors = Partial<Record<SettingsField, string>>;
export const settingsFieldLabels: Record<SettingsField, string> = {
  heroImageUrl: "Homepage hero banner", storyImageUrl: "Brand story image", heroPositionX:"Hero horizontal position",heroPositionY:"Hero vertical position",storyPositionX:"Story horizontal position",storyPositionY:"Story vertical position",
  instagramUrl: "Instagram profile URL", facebookUrl: "Facebook page URL", tiktokUrl: "TikTok profile URL", brandName: "Brand name",
  whatsappNumber: "WhatsApp number", walletNumber: "Electronic wallet number",
  instapayAddress: "InstaPay transfer address", shippingFee: "Legacy delivery fee",
  freeShippingThreshold: "Free shipping threshold", heroTagline: "Homepage headline",
  heroDescription: "Homepage description", heroTaglineAr:"Homepage headline (Arabic)",heroDescriptionAr:"Homepage description (Arabic)",storyHeadlineAr:"Our Story heading (Arabic)",storyDescriptionAr:"Our Story description (Arabic)", storyHeadline: "Our Story heading",
  storyDescription: "Our Story description", shippingPolicyAr:"Shipping & delivery policy — Arabic", returnsPolicyAr:"Returns & exchanges policy — Arabic", privacyPolicyAr:"Privacy policy — Arabic", shippingPolicy: "Shipping & delivery policy",
  returnsPolicy: "Returns & exchanges policy", privacyPolicy: "Privacy policy"
};
const trim = (value: unknown) => typeof value === "string" ? value.trim() : "";
function validImage(value: string) {
  if (/^\/api\/media\/noire-[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/.test(value) ||
      /^\/uploads\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/.test(value)) return true;
  try { return value.length <= 1500 && new URL(value).protocol === "https:"; } catch { return false; }
}
/** Returns ALL invalid fields; never echoes sensitive payment/contact values. */
export function validateStoreSettings(values: Partial<StoreSettings>): SettingsErrors {
  const errors: SettingsErrors = {};
  const requiredImage = (key: "heroImageUrl" | "storyImageUrl") => {
    const value = trim(values[key]);
    if (!value) errors[key] = "Add an image URL or upload an image before saving.";
    else if (!validImage(value)) errors[key] = "Use an HTTPS image URL or a valid uploaded image.";
  };
  requiredImage("heroImageUrl"); requiredImage("storyImageUrl");
  const instagram = trim(values.instagramUrl);
  if (!instagram) errors.instagramUrl = "Enter an Instagram profile URL (https://www.instagram.com/…).";
  else if (instagram.length > 1500 || !/^https:\/\/(www\.)?instagram\.com\//i.test(instagram)) errors.instagramUrl = "Use an HTTPS Instagram profile link starting with instagram.com/.";
  for (const [key, domain] of [["facebookUrl", "facebook.com"], ["tiktokUrl", "tiktok.com"]] as const) {
    const raw = trim(values[key]);
    if (!raw) continue; // Extra social channels are optional.
    try { const url = new URL(raw); if (url.protocol !== "https:" || ![domain, `www.${domain}`, ...(domain === "facebook.com" ? ["m.facebook.com"] : [])].includes(url.hostname.toLowerCase()) || !url.pathname.replace(/\//g, "")) errors[key] = `Use a valid HTTPS ${domain} profile/page URL.`; }
    catch { errors[key] = `Use a valid HTTPS ${domain} profile/page URL.`; }
    if (raw.length > 1500) errors[key] = "Limit this link to 1500 characters.";
  }
  const sized = (key: SettingsField, min: number, max: number) => {
    const size = trim(values[key]).length;
    if (size < min) errors[key] = `Enter at least ${min} characters.`;
    else if (size > max) errors[key] = `Limit this field to ${max} characters.`;
  };
  sized("brandName", 2, 80);
  sized("heroTagline", 4, 110);
  sized("heroDescription", 5, 350);
  sized("storyHeadline", 4, 110);
  sized("storyDescription", 5, 350);
  for (const [key,max] of [["heroTaglineAr",110],["heroDescriptionAr",350],["storyHeadlineAr",110],["storyDescriptionAr",350],["shippingPolicyAr",4000],["returnsPolicyAr",4000],["privacyPolicyAr",4000]] as const){if(trim(values[key]).length>max)errors[key]=`Limit Arabic content to ${max} characters.`;}
  sized("shippingPolicy", 20, 4000);
  sized("returnsPolicy", 20, 4000);
  sized("privacyPolicy", 20, 4000);
  for (const key of ["whatsappNumber", "walletNumber"] as const) {
    const raw = trim(values[key]);
    const digits = raw.replace(/\D/g, "");
    if (raw && !/^\d{10,15}$/.test(digits)) errors[key] = "Enter 10–15 digits, including the country code.";
  }
  if (trim(values.instapayAddress).length > 120) errors.instapayAddress = "Limit the InstaPay address to 120 characters.";
  const numeric = (key: "shippingFee" | "freeShippingThreshold", max: number) => {
    const val = values[key];
    if (typeof val !== "number" || !Number.isSafeInteger(val) || val < 0 || val > max)
      errors[key] = `Enter a whole number between 0 and ${max.toLocaleString("en-EG")} EGP.`;
  };
  for(const k of ["heroPositionX","heroPositionY","storyPositionX","storyPositionY"] as const){const v=values[k];if(!Number.isInteger(v)||typeof v!=="number"||v<0||v>100)errors[k]="Image focal position must be between 0 and 100.";}
  numeric("shippingFee", 10000);
  numeric("freeShippingThreshold", 1_000_000);
  return errors;
}
