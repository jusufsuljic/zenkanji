import React from 'react';
import { Kanji } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface KanjiCardProps {
  kanji: Kanji;
  onClick?: () => void;
  className?: string;
}

export const KanjiCard: React.FC<KanjiCardProps> = ({ kanji, onClick, className }) => {
  return (
    <Card 
      className={`group cursor-pointer border-none bg-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:bg-slate-950/70 ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex gap-2">
          {kanji.jlptLevel && (
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
              N{kanji.jlptLevel}
            </Badge>
          )}
          {kanji.grade && (
            <Badge variant="outline" className="text-muted-foreground">
              Grade {kanji.grade}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{kanji.strokeCount} strokes</span>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-4">
        <div className="text-6xl font-bold mb-4 group-hover:scale-110 transition-transform duration-300">
          {kanji.character}
        </div>
        <div className="text-lg font-medium text-center text-slate-800 mb-2">
          {kanji.meaning}
        </div>
        <Separator className="my-2" />
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground font-medium">On:</span>
            <span className="text-right">{(kanji.onReadings || []).join('、 ')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground font-medium">Kun:</span>
            <span className="text-right">{(kanji.kunReadings || []).join('、 ')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
