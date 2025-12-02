import React, { useEffect, useState, useCallback } from 'react';
import type { Question } from '../types';
import { progressSteps } from '../constants/quizData';

interface QuizScreenProps {
  questions: Question[];
  currentQuestionIndex: number;
  onAnswer: (answer: string) => void;
  trackQuestionView: (questionId: number) => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ 
  questions, 
  currentQuestionIndex, 
  onAnswer, 
  trackQuestionView 
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = progressSteps[currentQuestionIndex];
  const [hasMouseMoved, setHasMouseMoved] = useState(false);

  const categoryColors: { [key in Question['category']]: string } = {
    'A REALIDADE ATUAL': 'from-primary to-primary-dark',
    'SINAIS DE ALERTA': 'from-secondary to-secondary-dark',
    'O FUTURO DELES': 'from-warning to-warning-dark',
    'SUA DECISÃO': 'from-accent to-accent-dark',
  };

  const categoryColor = categoryColors[currentQuestion.category];

  useEffect(() => {
    if (currentQuestion) {
      trackQuestionView(currentQuestion.id);
    }
  }, [currentQuestionIndex, currentQuestion, trackQuestionView]);

  useEffect(() => {
    setHasMouseMoved(false);

    const handleMouseMove = () => {
      setHasMouseMoved(true);
      window.removeEventListener('mousemove', handleMouseMove);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentQuestionIndex]);

  const getButtonClasses = useCallback((isOverlayDiv: boolean, isNumberDiv: boolean) => {
    const baseClasses = "transition-all duration-300";
    let specificClasses = "";
    let hoverClasses = "";

    if (isOverlayDiv) {
      specificClasses = "absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0";
      hoverClasses = "group-hover:from-primary/10 group-hover:to-primary-dark/10";
    } else if (isNumberDiv) {
      specificClasses = "flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-full flex items-center justify-center text-sm font-bold";
      hoverClasses = "group-hover:from-white/20 group-hover:to-white/20";
    } else {
      specificClasses = "group w-full bg-surface border-2 border-border text-text-primary font-semibold py-5 px-6 rounded-2xl text-left text-base sm:text-lg transform focus:outline-none focus:ring-4 focus:ring-primary/30 relative overflow-hidden";
      hoverClasses = "hover:bg-gradient-to-r hover:from-primary hover:to-primary-dark hover:border-primary hover:text-white hover:scale-105 hover:shadow-elegant-lg";
    }

    return `${baseClasses} ${specificClasses} ${hasMouseMoved ? hoverClasses : ''}`;
  }, [hasMouseMoved]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-primary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Barra de progresso */}
        <div className="mb-8">
          <div className="flex justify-center items-center mb-3">
            <span className="text-sm font-semibold text-primary">
              {progressPercentage}% completo
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="h-3 bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-700 ease-out relative overflow-hidden" 
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Card da pergunta */}
        <div className="bg-background rounded-3xl shadow-elegant-xl p-8 sm:p-10 text-center border border-border relative overflow-hidden">
          {/* Decoração de fundo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
          
          {/* Emoji da pergunta */}
          {currentQuestion.icon && (
            <div className="text-7xl mb-6 relative z-10">
              {currentQuestion.icon}
            </div>
          )}
          
          {/* Badge da categoria */}
          <div className={`inline-block bg-gradient-to-r ${categoryColor} text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-6 shadow-elegant`}>
            {currentQuestion.category}
          </div>
          
          {/* Pergunta */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-10 text-text-primary leading-tight relative z-10">
            {currentQuestion.text}
          </h2>
          
          {/* Opções de resposta */}
          <div className="space-y-4 relative z-10">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => onAnswer(option)}
                className={getButtonClasses(false, false)}
              >
                {/* Efeito de hover */}
                <div className={getButtonClasses(true, false)}></div>
                
                {/* Número da opção */}
                <div className="flex items-center space-x-4 relative z-10">
                  <div className={getButtonClasses(false, true)}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Indicador de progresso visual */}
        <div className="mt-8 flex justify-center space-x-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index <= currentQuestionIndex
                  ? 'bg-gradient-to-r from-primary to-primary-dark shadow-elegant'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;