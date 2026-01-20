import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Mail, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const EmailCapture = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('email_subscriptions')
        .insert({
          email: email.trim().toLowerCase(),
          source: 'landing_page'
        });

      if (insertError) {
        // If it's a unique constraint violation, treat as success (already subscribed)
        if (insertError.code === '23505') {
          setIsSubmitted(true);
          setEmail('');
        } else {
          throw insertError;
        }
      } else {
        setIsSubmitted(true);
        setEmail('');
      }
    } catch (err: any) {
      console.error('Error subscribing email:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      
      // Reset success message after 5 seconds
      if (isSubmitted) {
        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
      }
    }
  };

  return (
    <div className="glass-light rounded-2xl border border-white/10 p-8">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
            <Mail className="w-5 h-5 text-neon-emerald" aria-hidden="true" />
            <h3 className="text-xl font-bold text-white">Stay Updated</h3>
          </div>
          <p className="text-slate-400 text-sm">
            Get the latest updates, tips, and exclusive beta features delivered to your inbox.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:border-transparent transition-all"
              aria-label="Email address"
              disabled={isLoading || isSubmitted}
            />
            <Button
              type="submit"
              variant="cta"
              disabled={isLoading || isSubmitted}
              className="whitespace-nowrap"
            >
              {isSubmitted ? (
                <>
                  <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                  Subscribed!
                </>
              ) : isLoading ? (
                'Subscribing...'
              ) : (
                'Subscribe'
              )}
            </Button>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-sm text-red-400 text-center sm:text-left flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              {error}
            </motion.p>
          )}
          {isSubmitted && !error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-neon-emerald text-center sm:text-left flex items-center gap-1"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Thanks for subscribing! Check your inbox.
            </motion.p>
          )}
        </form>
      </div>
    </div>
  );
};
