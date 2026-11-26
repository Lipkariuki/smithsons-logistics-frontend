// Network byte progress only; never estimate server-side processing completion.
export function transferPercent(event){const {loaded,total}=event;if(!Number.isFinite(loaded)||!Number.isFinite(total)||total<=0)return null;return Math.min(100,Math.max(0,Math.floor(loaded*100/total)));}
export function isCancelled(error){return error?.code==='ERR_CANCELED'||error?.name==='AbortError'||error?.name==='CanceledError';}
