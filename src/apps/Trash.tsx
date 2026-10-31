import { useRef, useState } from 'react';
import { Trash2, RotateCcw, X, AlertTriangle, LoaderCircle } from 'lucide-react';
import { useData, type Item } from '../stores/data';
import { apps } from '../lib/apps';
import { Modal } from '../components/Modal';

export function Trash() {
  const { items, restore, purge } = useData();
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const lock = useRef(false);
  const deleted = items.filter(item => item.deleted);
  function closeConfirmation() { if (!lock.current) { setPending(null); setDeleteError(''); } }
  async function deletePermanently() {
    if (!pending || lock.current) return;
    lock.current = true; setDeleting(true); setDeleteError('');
    try { await purge(pending.id); setPending(null); }
    catch (e) { setDeleteError((e as Error).message || 'Could not delete this item. Please try again.'); }
    finally { lock.current = false; setDeleting(false); }
  }
  return <div className="app-page"><span className="eyebrow">NOT QUITE GOODBYE</span><h1>Trash</h1><p>Restore a little moment, or let it go for good.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="record-list">{deleted.map(item => <div className="record-card" key={item.id}><Trash2 size={19}/><div className="record-main"><h3>{item.title}</h3><p>{apps.find(app => app.id === item.kind)?.short || item.kind}</p></div><button className="button" onClick={() => restore(item.id).catch(e => setError(e.message))}><RotateCcw size={14}/>Restore</button><button className="icon-button" aria-label={'Permanently delete ' + item.title} onClick={() => { setDeleteError(''); setPending(item); }}><Trash2 size={15}/></button></div>)}</div>
    {!deleted.length && <div className="empty-state"><Trash2 size={35} strokeWidth={1}/><h2>All tidy here.</h2><p>Deleted records will wait here for a second chance.</p></div>}
    {pending && <Modal label="Delete permanently?" descriptionId="delete-explanation" onClose={closeConfirmation} busy={deleting}>
      <section className="delete-confirmation">
        <div className="delete-confirmation-top"><span className="delete-symbol"><Trash2 size={24} strokeWidth={1.5}/></span><button className="icon-button" aria-label="Close delete confirmation" disabled={deleting} onClick={closeConfirmation}><X size={18}/></button></div>
        <span className="eyebrow">A LITTLE GOODBYE</span><h2>Delete permanently?</h2>
        <p id="delete-explanation">This record will be removed from your workspace. You won’t be able to restore it.</p>
        <div className="delete-item-preview"><span><Trash2 size={17}/></span><div><small>{apps.find(app => app.id === pending.kind)?.short || 'Saved item'}</small><strong>{pending.title}</strong></div></div>
        <div className="delete-warning"><AlertTriangle size={14}/><span>This action can’t be undone. You can cancel and restore the item instead.</span></div>
        {deleteError && <p className="error" role="alert">{deleteError}</p>}
        <div className="delete-confirmation-actions"><button data-autofocus className="button subtle" disabled={deleting} onClick={closeConfirmation}>Cancel</button><button className="button danger" disabled={deleting} onClick={deletePermanently}>{deleting ? <LoaderCircle size={15} className="spin"/> : <Trash2 size={15}/>} {deleting ? 'Deleting…' : 'Delete permanently'}</button></div>
      </section>
    </Modal>}
  </div>;
}
