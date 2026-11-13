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
    <div className="w-full px-4 flex flex-col items-center lg:items-start text-center lg:text-right">
      <Typewriter
        text={title}
        className="mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight break-words text-soil-900 dark:text-dust-50 text-center lg:text-right"
      />

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-base sm:text-lg lg:text-xl leading-8 text-soil-700/80 dark:text-dust-200/80 text-center lg:text-right mx-auto lg:mx-0 max-w-md lg:max-w-xl px-4"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
