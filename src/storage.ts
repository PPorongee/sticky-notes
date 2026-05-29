// 브라우저에게 IndexedDB 데이터를 "영구(persistent)"로 보관하도록 요청한다.
// 기본값인 best-effort 저장소는 브라우저를 닫거나 저장공간이 부족하면
// 사용자 동의 없이 비워질 수 있다 → 메모가 사라지는 원인.
// persist()가 승인되면 브라우저는 이 출처의 데이터를 함부로 지우지 않는다.

export type PersistResult = 'persisted' | 'denied' | 'unsupported'

export async function requestPersistentStorage(): Promise<PersistResult> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported'
  }
  try {
    // 이미 영구로 지정돼 있으면 다시 요청하지 않는다.
    if (navigator.storage.persisted && (await navigator.storage.persisted())) {
      return 'persisted'
    }
    const granted = await navigator.storage.persist()
    return granted ? 'persisted' : 'denied'
  } catch {
    return 'unsupported'
  }
}
