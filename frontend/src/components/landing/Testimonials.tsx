import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import Card from '../ui/Card';

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Freelance Consultant",
    company: "Tech Solutions Inc.",
    content: "Cashual has completely transformed how I manage my business finances. I save at least 5 hours every week that I used to spend on spreadsheets and bookkeeping. The peace of mind knowing everything is organized for tax time is priceless.",
    rating: 5,
    image: "SC"
  },
  {
    name: "Michael Rodriguez",
    role: "Contractor",
    company: "Rodriguez Construction",
    content: "As a contractor, I needed something simple but powerful. Cashual keeps everything organized in one place, and my accountant loves how clean the records are. No more scrambling at tax time.",
    rating: 5,
    image: "MR"
  },
  {
    name: "Jennifer Park",
    role: "Professional Corporation Owner",
    company: "Park Legal Services",
    content: "Finally, a platform built for Canadian businesses. Everything I need is in one place, and I can trust that the calculations are CRA-compliant. It's given me confidence in my financial management.",
    rating: 5,
    image: "JP"
  }
];

export const Testimonials = () => {
  // Generate Review schema for SEO
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": testimonials.map((testimonial, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": testimonial.name,
          "jobTitle": testimonial.role,
          "worksFor": {
            "@type": "Organization",
            "name": testimonial.company
          }
        },
        "reviewBody": testimonial.content,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": testimonial.rating,
          "bestRating": 5
        },
        "itemReviewed": {
          "@type": "SoftwareApplication",
          "name": "Cashual"
        }
      }
    }))
  };

  return (
    <section className="py-24 relative" aria-labelledby="testimonials-heading">
      {/* Review Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            id="testimonials-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Loved by Canadian <span className="text-neon-emerald">Business Owners</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg"
          >
            Join hundreds of Canadian businesses who trust Cashual for their accounting needs.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              itemScope
              itemType="https://schema.org/Review"
            >
              <Card className="h-full flex flex-col group hover:border-white/20 hover:shadow-lg hover:shadow-neon-emerald/10 transition-all duration-300" glass="light">
                <div itemProp="itemReviewed" itemScope itemType="https://schema.org/SoftwareApplication" className="hidden">
                  <meta itemProp="name" content="Cashual" />
                </div>
                <div className="mb-4 flex items-center gap-1" itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                  <meta itemProp="ratingValue" content={testimonial.rating.toString()} />
                  <meta itemProp="bestRating" content="5" />
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-golden-hour text-golden-hour transition-transform group-hover:scale-110"
                      style={{ transitionDelay: `${i * 50}ms` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                
                <Quote className="w-8 h-8 text-neon-emerald/30 mb-4 group-hover:text-neon-emerald/50 transition-colors" aria-hidden="true" />
                
                <p className="text-slate-300 mb-6 flex-1 leading-relaxed" itemProp="reviewBody">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3 pt-4 border-t border-white/10 group-hover:border-white/20 transition-colors" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <div className="w-10 h-10 rounded-full bg-neon-emerald/20 group-hover:bg-neon-emerald/30 flex items-center justify-center text-neon-emerald font-semibold transition-colors" aria-label={`${testimonial.name} avatar`}>
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-neon-emerald transition-colors" itemProp="name">{testimonial.name}</div>
                    <div className="text-sm text-slate-400" itemProp="jobTitle">
                      {testimonial.role} • <span itemProp="worksFor" itemScope itemType="https://schema.org/Organization"><span itemProp="name">{testimonial.company}</span></span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.article>
          ))}
        </div>

        {/* Social Proof Numbers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 glass-light rounded-full border border-white/10">
            <span className="text-sm text-slate-400">Join</span>
            <span className="text-2xl font-bold text-neon-emerald">500+</span>
            <span className="text-sm text-slate-400">Canadian businesses using Cashual</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
