package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.Optional;

// 지금 차례(처음 버리기 단계에는 없음), 고르는 카드 신호, 섞기 쿨다운.
public class TurnState {

    /** null = 처음 버리기 단계(R36). 첫 차례가 시작되면 늘 있다. */
    private Turn turn;
    private final PeekState peek = new PeekState();
    private final ShuffleCooldowns cooldowns = new ShuffleCooldowns();

    public boolean isOpening() {
        return turn == null;
    }

    public TurnStep step() {
        if (turn == null) {
            return TurnStep.opening();
        }
        return turn.step();
    }

    public boolean is(OldMaidStage stage) {
        return step().is(stage);
    }

    // 처음 버리기 단계에는 차례가 없으므로 차례를 묻는 행동은 INVALID_PHASE.
    public Turn current() {
        if (turn == null) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
        return turn;
    }

    public boolean isDrawer(PlayerId player) {
        return turn != null && turn.isDrawer(player);
    }

    // R12: 뽑는 사람만, 뽑기 단계에서만(짝 버리기 단계면 먼저 짝을 버린다).
    public Turn requireDrawer(PlayerId player) {
        return require(player, OldMaidStage.DRAW);
    }

    // R37: 뽑은 사람만, 짝 버리기 단계에서만.
    public Turn requireDiscarder(PlayerId player) {
        return require(player, OldMaidStage.DISCARD);
    }

    private Turn require(PlayerId player, OldMaidStage stage) {
        Turn now = current();
        if (!now.isDrawer(player)) {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }
        if (!now.is(stage)) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
        return now;
    }

    // R21: 새 차례는 순번을 올리고 신호를 지운다. 처음 버리기 다음 첫 차례는 순번 1.
    public void begin(PlayerId drawer, PlayerId target) {
        turn = new Turn(drawer, target, step().nextTurn());
        peek.restart();
    }

    // R37: 뽑은 카드로 짝이 되면 같은 차례에서 짝 버리기 단계로(마감을 새로 잰다). 뽑은 자리 신호는 지운다.
    public void awaitDiscard() {
        turn = current().discarding();
        peek.clear();
    }

    // R27: 같은 뽑는 사람의 상대를 다시 정한다. 상대가 그대로면 순번(마감)은 그대로 두고 신호만 지운다.
    // 짝 버리기 단계면 상대만 바꾸고 단계·마감은 그대로 둔다(버린 뒤에 차례가 넘어간다).
    public void retarget(PlayerId target) {
        Turn now = current();
        if (now.target().equals(target)) {
            peek.clear();
            return;
        }
        if (now.is(OldMaidStage.DISCARD)) {
            turn = now.withTarget(target);
            return;
        }
        begin(now.drawer(), target);
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

    // R22·R23: 처음 버리기 단계에는 뽑는 사람이 없어 카드를 가진 누구나 섞을 수 있다.
    public void useShuffle(PlayerId player, Instant now) {
        if (isDrawer(player)) {
            throw new BusinessException(ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED);
        }
        cooldowns.use(player, now);
    }
}
