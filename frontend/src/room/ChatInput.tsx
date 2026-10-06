import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

export const CHAT_MAX_LENGTH = 200;

type Props = {
  /** 보냈으면 true. false면 입력한 글을 그대로 남겨 둔다. */
  onSend: (text: string) => boolean;
  /** 열리자마자 입력창에 포커스를 줄지(게임 중 채팅 서랍). */
  autoFocus?: boolean;
};

/** 채팅 입력칸과 보내기 버튼. 채팅 패널과 채팅 줄이 함께 쓴다. */
export function ChatInput({ onSend, autoFocus = false }: Props) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const submit = () => {
    if (!trimmed) {
      return;
    }
    if (onSend(trimmed)) {
      setText('');
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  // 한글 조합 중 Enter는 글자를 확정하는 키라서 보내지 않는다.
  // Safari(WebKit)는 조합을 끝내는 Enter를 isComposing=false, keyCode 229로 보내므로 함께 거른다.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }
    submit();
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input ref={inputRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown}
        aria-label="채팅 입력" maxLength={CHAT_MAX_LENGTH} placeholder="메시지를 입력해요" autoComplete="off"
        className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-cream px-3 py-2 text-sm shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50" />
      <button type="submit" disabled={!trimmed}
        className="press-3d shrink-0 rounded-xl bg-mustard-400 px-3 py-2 text-sm font-bold text-wood-800 shadow-[0_3px_0_var(--color-mustard-600)] hover:bg-mustard-300 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
        보내기
      </button>
    </form>
  );
}
