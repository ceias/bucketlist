import { differenceInCalendarDays } from 'date-fns';
import { Heart, LockKeyhole } from 'lucide-react';
import { nextAnniversary } from './Home';
import { Collections } from './Collections';
export function Anniversary(){return <div className="anniversary-app"><div className="vault-hero"><img src="/assets/decorations/flower.svg" alt=""/><span className="eyebrow">13 REASONS, EVERY FEBRUARY 13</span><h1>Our First 365 Days</h1><p>A little vault for the things that mean everything.</p><b>{differenceInCalendarDays(nextAnniversary(),new Date())}<small>days until our next February 13</small></b><span className="anniversary-date"><Heart size={13}/> First anniversary · February 13, 2027</span></div><div className="quiet-note vault-note"><LockKeyhole size={14}/>Letters can be shared or private. Scheduled unlock and time capsules are planned; these notes are available immediately.</div><Collections kind="anniversary"/></div>}
