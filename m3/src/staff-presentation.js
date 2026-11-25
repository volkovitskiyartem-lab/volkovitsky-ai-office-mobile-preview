/* Art V3: identity and DEMO-only presentation metadata.
 * Never infer actual progress or task completion from an animated pose.
 */
export const portraitVariants=8;
export function portraitFor(agent){
  const value=Number.isFinite(agent?.variant)?Math.trunc(agent.variant):0;
  return '/assets/agents/portrait-'+((value%portraitVariants+portraitVariants)%portraitVariants)+'.png';
}
export function staffStateLabel(agent,mode='demo'){
  if(mode!=='demo')return 'Нет подтверждённых данных';
  if(agent?.path?.length>0){
    return agent.goal==='meeting'?'Идёт на встречу · DEMO':'Перемещается · DEMO';
  }
  const states={
    seating:'Садится за стол · DEMO',
    typing:'Работает за компьютером · DEMO',
    review:'Проверяет материалы · DEMO',
    standing:'Встаёт из кресла · DEMO',
    break:'Перерыв на кофе · DEMO',
    stretch:'Разминается · DEMO',
    wave:'Приветствует коллегу · DEMO',
    meeting:'Обсуждает материалы · DEMO',
    'meeting-wait':'Ожидает коллегу за столом · DEMO',
    'meeting-wrap':'Завершает встречу · DEMO',
    working:'За работой · DEMO',
    idle:'В кабинете · DEMO'
  };
  return states[agent?.state]||'В кабинете · DEMO';
}
