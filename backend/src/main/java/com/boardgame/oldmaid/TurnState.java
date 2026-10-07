package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.Optional;

// 지금 차례, 고르는 카드 신호, 섞기 쿨다운.
public class TurnState {

    private Turn turn;
    private final PeekState peek = new PeekState();
    private final ShuffleCooldowns cooldowns = new ShuffleCooldowns();

    TurnState(Turn first) {
        this.turn = first;
    }

    public Turn current() {
        return turn;
    }

    public Turn requireDrawer(PlayerId player) {
        if (!turn.isDrawer(player)) {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }
        return turn;
    }

    // R21: 새 차례는 순번을 올리고 신호를 지운다.
    public void begin(PlayerId drawer, PlayerId target) {
        turn = new Turn(drawer, target, turn.seq().next());
        peek.clear();
    }

    // R27: 같은 뽑는 사람의 상대를 다시 정한다. 상대가 그대로면 순번(마감)은 그대로 두고 신호만 지운다.
    public void retarget(PlayerId target) {
        if (turn.target().equals(target)) {
            peek.clear();
            return;
        }
        begin(turn.drawer(), target);
    }

    public boolean movePeek(Optional<SlotIndex> slot, Instant now) {
        return peek.move(slot.orElse(null), now);
    }

    public Optional<SlotIndex> peekSlot() {
        return peek.slot();
    }

    public long peekSeq() {
        return peek.seq();
    }

    // R22·R23
    public void useShuffle(PlayerId player, Instant now) {
        if (turn.isDrawer(player)) {
            throw new BusinessException(ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED);
        }
        cooldowns.use(player, now);
    }
}
