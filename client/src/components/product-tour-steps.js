export const productTourSteps = [
  {
    title: 'Welcome to MedGuide AI',
    copy: 'Your account is ready. This short tour shows where to enter symptoms, compare possible patterns, ask follow-up questions, review history, and update your profile.'
  },
  {
    view: 'symptom',
    target: '#sym-in',
    title: 'Describe what you are feeling',
    copy: 'Add the symptoms, when they started, and what makes them better or worse. More context helps the AI return clearer informational guidance.'
  },
  {
    view: 'symptom',
    target: '#severity-panel',
    title: 'Set the current severity',
    copy: 'Choose mild, moderate, or severe based on how you feel now. You can also use quick tags beside this panel.'
  },
  {
    view: 'symptom',
    target: '#analyze-button',
    title: 'Create your guidance report',
    copy: 'Select Analyze Symptoms Now. The report opens the closest pattern first and shows 2–3 lower matches underneath for comparison—not as diagnoses.'
  },
  {
    view: 'chat',
    target: '#nav-chat',
    title: 'Ask a follow-up question',
    copy: 'Use the AI Health Assistant for general explanations about your report. It cannot diagnose you or replace a clinician.'
  },
  {
    view: 'history',
    target: '#nav-history',
    title: 'Return to previous checks',
    copy: 'Every completed symptom check is saved privately to your account. Open an earlier report here or delete it when you no longer need it.'
  },
  {
    view: 'profile',
    target: '#nav-profile',
    title: 'Keep your profile current',
    copy: 'Optional age, blood type, and allergy details can give the assistant useful context. Select Finish to begin with the symptom checker.'
  }
];
