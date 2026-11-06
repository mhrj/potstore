'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Typewriter from './Typewriter';

type HeroTitleProps = {
  title: string;
  subtitle: string;
};

export default function HeroTitle({ title, subtitle }: HeroTitleProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <Typewriter
        text={title}
        className="mt-6 mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight font-black text-soil-900 dark:text-dust-50 text-center"
      />

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl text-base leading-8 text-soil-700/85 dark:text-dust-200/85 sm:text-lg mx-auto text-center"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
