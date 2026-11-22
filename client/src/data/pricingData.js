import { CheckIcon } from "lucide-react";

export const pricingData = [
  {
    title: "Free / Trial",
    price: "Coming Soon",
    features: [
      { name: "Document upload", icon: CheckIcon },
      { name: "Text extraction", icon: CheckIcon },
      { name: "Translation workflow", icon: CheckIcon },
    ],
    buttonText: "Contact Us",
  },
  {
    title: "Standard Translation",
    price: "Coming Soon",
    mostPopular: true,
    features: [
      { name: "Afaan Oromo, Amharic, and English", icon: CheckIcon },
      { name: "Editable extracted text", icon: CheckIcon },
      { name: "Translated PDF", icon: CheckIcon },
      { name: "QR verification", icon: CheckIcon },
    ],
    buttonText: "Contact Us",
  },
  {
    title: "Human-reviewed Translation",
    price: "Coming Soon",
    features: [
      { name: "Standard translation workflow", icon: CheckIcon },
      { name: "Authorized human review", icon: CheckIcon },
      { name: "Document approval", icon: CheckIcon },
      { name: "Translated PDF and QR verification", icon: CheckIcon },
    ],
    buttonText: "Contact Us",
  },
];
