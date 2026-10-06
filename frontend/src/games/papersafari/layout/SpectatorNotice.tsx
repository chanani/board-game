import { BinocularsIcon } from '../../../components/icons';
import { Panel } from '../../../components/ui';

/** 관전자에게는 내 판이 없으므로, 그 자리에 관전 중이라는 안내를 둔다. */
export function SpectatorNotice() {
  return <Panel className="px-6 py-4 text-center font-bold text-wood-800"><BinocularsIcon className="mr-1.5 inline h-5 w-5 align-[-3px]" />관전 중이에요</Panel>;
}
