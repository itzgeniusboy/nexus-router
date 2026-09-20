import React from 'react';
import {
  Bot,
  Brain,
  Cloud,
  Compass,
  Cpu,
  Flame,
  Globe,
  Hash,
  Layers,
  Network,
  Rocket,
  Server,
  Share2,
  Sliders,
  Wind,
  Zap,
} from 'lucide-react';
import { ProviderId } from '../types';

interface Props {
  provider: ProviderId;
  className?: string;
  size?: number;
}

export const ProviderIcon: React.FC<Props> = ({ provider, className = 'w-5 h-5', size = 20 }) => {
  switch (provider) {
    case 'openai':
      return <Bot className={className} size={size} />;
    case 'anthropic':
      return <Brain className={className} size={size} />;
    case 'google':
      // Clean generic Cpu / Hardware chip icon strictly avoiding any gemini logo or icon
      return <Cpu className={className} size={size} />;
    case 'groq':
      return <Zap className={className} size={size} />;
    case 'deepseek':
      return <Compass className={className} size={size} />;
    case 'mistral':
      return <Wind className={className} size={size} />;
    case 'xai':
      return <Hash className={className} size={size} />;
    case 'cohere':
      return <Share2 className={className} size={size} />;
    case 'openrouter':
      return <Network className={className} size={size} />;
    case 'perplexity':
      return <Globe className={className} size={size} />;
    case 'together':
      return <Server className={className} size={size} />;
    case 'fireworks':
      return <Flame className={className} size={size} />;
    case 'azure':
      return <Cloud className={className} size={size} />;
    case 'bedrock':
      return <Layers className={className} size={size} />;
    case 'custom':
    default:
      return <Sliders className={className} size={size} />;
  }
};
