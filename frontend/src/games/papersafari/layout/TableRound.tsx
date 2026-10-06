import type { BoardView } from '../../../api/types';
import { Felt } from '../../../components/Felt';
import { CenterPiles, type PileSize } from './CenterPiles';
import { MySide } from './MySide';
import { OpponentSeat } from './OpponentSeat';
import { HandAnchor, Seat, type SeatSize } from './Seat';
import { SpectatorNotice } from '../../../table/SpectatorNotice';
import { seatRows } from '../../../table/seats';
import type { TableProps } from '../PaperSafariTable';

/**
 * pc: 큰 둥근 테이블(PC·태블릿).
 * landscape: 휴대폰을 눕힌 낮은 화면. 상대는 모두 맞은편 한 줄(양 끝은 조금 아래), 덱·내 판·내 옆 칸은 아래 한 줄.
 * mini: 세로 휴대폰용 가장 작은 테이블. landscape·mini는 상대 카드 폭 28px, 예상 점수는 크게 보기에서만.
 */
export type TableDensity = 'pc' | 'landscape' | 'mini';

type DensityStyle = {
  opponent: SeatSize;
  piles: PileSize;
  me: SeatSize;
  felt: string;
  top: string;
  middle: string;
  myRow: string;
};

const DENSITY: Record<TableDensity, DensityStyle> = {
  pc: {
    opponent: 'sm', piles: 'md', me: 'lg',
    felt: 'min-h-[min(70vh,640px)] max-w-6xl justify-between gap-4 px-[6%] pb-4 pt-6',
    top: 'gap-12', middle: 'gap-4', myRow: 'mt-8',
  },
  landscape: {
    opponent: 'mini', piles: 'sm', me: 'sm',
    felt: 'gap-2 px-[6%] pb-3 pt-3',
    top: 'gap-3', middle: 'gap-3', myRow: 'mt-0',
  },
  mini: {
    opponent: 'mini', piles: 'xs', me: 'sm',
    felt: 'gap-2 px-2 pb-4 pt-5',
    top: 'gap-3', middle: 'gap-1', myRow: 'mt-2',
  },
};

type Props = TableProps & { density?: TableDensity };

// 자리를 절대 위치로 겹쳐 놓지 않고 위 줄 · 가운데 줄 · 내 줄로 흘려 놓아, 인원과 화면 높이와 상관없이 서로 겹치지 않게 한다.
// 펠트는 내용만큼 자라고, 위 줄은 가운데로 모아 타원의 둥근 모서리 밖으로 나가지 않게 한다.
export function TableRound({ density = 'pc', ...props }: Props) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, canClickSlot, clickSlot, drawable, send, canDiscard, canUndo, estimate, myTurn, timerFor } = props;
  const round = view.game.round;
  const rows = seatRows(opponents.length);
  const style = DENSITY[density];
  const pc = density === 'pc';
  const opponentSeat = (index: number | null) => {
    const board: BoardView | undefined = index === null ? undefined : opponents[index];
    if (!board) {
      return null;
    }
    return (
      <div key={board.playerId} data-testid="opponent-seat">
        <OpponentSeat board={board} nickname={nicknameOf(board.playerId)} size={style.opponent} handOverlay={!pc} showEstimate={style.opponent !== 'mini'}
          active={round.currentPlayerId === board.playerId} held={round.held} presence={presenceOf(board.playerId)} timer={timerFor(board.playerId)} />
      </div>
    );
  };
  const mySeat = myBoard ? (
    <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} active={myTurn} turnRing={myTurn} hand="none" timer={timerFor(meId)}
      held={round.held} size={style.me} presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
  ) : null;
  const mySide = myBoard ? (
    <MySide canDiscard={canDiscard} canUndo={canUndo} estimate={estimate}
      hand={<HandAnchor board={myBoard} held={round.held} size={style.me} handLabel="들고 있는 카드" />}
      onDiscard={() => send({ type: 'DISCARD' })} onUndo={() => send({ type: 'CANCEL_DRAW' })} />
  ) : null;
  const piles = (
    <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size={style.piles}
      onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
  );
  const sideBox = (width: string) => (mySide ? <div className={`flex ${width} shrink-0`}>{mySide}</div> : null);

  // 눕힌 휴대폰: 높이가 낮아 상대는 모두 맞은편 한 줄(양 끝은 조금 아래로 둘러앉은 느낌), 덱·내 판·내 옆 칸은 아래 한 줄.
  const landscapeRows = (
    <>
      <div data-testid="opponent-row" className={`flex items-start justify-center ${style.top}`}>
        <div className="pt-6">{opponentSeat(rows.left)}</div>
        {rows.top.map(opponentSeat)}
        <div className="pt-6">{opponentSeat(rows.right)}</div>
      </div>
      <div data-testid="my-row" className={`${style.myRow} flex items-center justify-center gap-4`}>
        {piles}
        {mySeat ?? <SpectatorNotice />}
        {sideBox('w-28')}
      </div>
    </>
  );

  // 그 밖의 배치: 위 줄 · 가운데 줄(왼쪽 상대, 덱, 오른쪽 상대) · 내 줄.
  // 덱·버린 카드 묶음과 내 판 사이는 PC에서 32px 이상(mt-8 + gap-4, 내 차례에 판이 8px 떠올라도 40px) 띄운다.
  const roundRows = (
    <>
      {rows.top.length > 0 ? (
        <div className={`flex items-start justify-center ${style.top}`}>{rows.top.map(opponentSeat)}</div>
      ) : null}
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${style.middle}`}>
        <div className="justify-self-start">{opponentSeat(rows.left)}</div>
        {piles}
        <div className="justify-self-end">{opponentSeat(rows.right)}</div>
      </div>
      {pc ? (
        <div data-testid="my-row" className={`${style.myRow} grid grid-cols-[1fr_auto_1fr] items-end gap-4`}>
          <div />
          {mySeat ? <div className={`transition-transform duration-300 ${myTurn ? '-translate-y-2' : ''}`}>{mySeat}</div> : <SpectatorNotice />}
          {mySide ? <div className="flex w-36 self-center justify-self-start">{mySide}</div> : <div />}
        </div>
      ) : (
        <div data-testid="my-row" className={`${style.myRow} flex w-full items-start justify-center gap-2`}>
          {mySeat ?? <SpectatorNotice />}
          {sideBox('w-28')}
        </div>
      )}
    </>
  );

  return (
    <div data-testid="table-round" data-density={density} className="space-y-3">
      <Felt shape="oval" className={`mx-auto flex w-full flex-col ${style.felt}`}>
        {density === 'landscape' ? landscapeRows : roundRows}
      </Felt>
    </div>
  );
}
