import { useEffect,useState } from 'react';
import { Camera } from 'lucide-react';
import type { Item } from '../stores/data';
import { supabase } from '../lib/supabase';
export function MemoryPhoto({ item, onClick }: { item: Item; onClick: () => void }) {
  const [url,setUrl] = useState(item.data.localUrl || '');
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    let live = true; setFailed(false);
    if (item.data.path && supabase) supabase.storage.from('memories').createSignedUrl(item.data.path,3600).then(({data,error}) => { if(live) { if(data)setUrl(data.signedUrl);if(error)setFailed(true); } });
    else setUrl(item.data.localUrl || '');
    return () => { live = false; };
  }, [item.data.path,item.data.localUrl]);
  return <button className="photo-image" aria-label={`View ${item.title}`} onClick={onClick}>{url && !failed ? <img src={url} alt={item.title} onError={() => setFailed(true)}/> : <span className="photo-unavailable"><Camera size={30}/>{failed && <small>Photo unavailable. Try reopening.</small>}</span>}</button>;
}
