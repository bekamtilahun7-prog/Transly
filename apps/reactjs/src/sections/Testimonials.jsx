import Marquee from "react-fast-marquee";
import TestimonialCard from "../components/TestimonialCard";
import { testimonialsData } from "../data/testimonialsData";
import SectionTitle from "../components/SectionTitle";

export default function Testimonials() {
  return (
    <div id="how-it-works">
      <SectionTitle
        text1="How It Works"
        text2="Translate documents in three steps"
        text3="Move from document upload to a reviewed, downloadable, and verifiable result."
      />

      <Marquee className="max-w-5xl mx-auto mt-11" gradient={true} speed={25}>
        <div className="flex items-center justify-center py-5">
          {[...testimonialsData, ...testimonialsData].map(
            (testimonial, index) => (
              <TestimonialCard key={index} testimonial={testimonial} />
            ),
          )}
        </div>
      </Marquee>
    </div>
  );
}
