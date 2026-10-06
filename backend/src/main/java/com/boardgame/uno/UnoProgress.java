package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Optional;

// 지금 단계, 단계 순번, +4 도전 상태.
public class UnoProgress {

    private Turn turn;
    private StageSeq seq;
    private final ChallengeState challenge = new ChallengeState();

    public UnoProgress(Turn first) {
        this.turn = first;
        this.seq = StageSeq.first();
    }

    public void charge(FourCharge next) {
        challenge.charge(next);
    }

    public Optional<FourCharge> pendingCharge() {
        return challenge.pending();
    }

    public FourCharge takeCharge() {
        return challenge.take();
    }

    public void clearCharge() {
        challenge.clear();
    }

    public void reveal(ChallengeReveal next) {
        challenge.reveal(next);
    }

    public Optional<ChallengeReveal> revealFor(PlayerId viewer) {
        return challenge.revealFor(viewer);
    }

    public void forgetReveal() {
        challenge.forgetReveal();
    }

    public void begin(Turn next) {
        turn = next;
        seq = seq.next();
    }

    public PlayerId actor() {
        return turn.actor();
    }

    public UnoStage stage() {
        return turn.stage();
    }

    public StageSeq seq() {
        return seq;
    }

    public boolean isActor(PlayerId player) {
        return turn.isActor(player);
    }

    public boolean isActorIn(PlayerId player, UnoStage... stages) {
        return turn.isActor(player) && turn.isIn(stages);
    }

    public boolean is(UnoStage stage) {
        return turn.isIn(stage);
    }

    public Optional<CardId> drawnCard() {
        return turn.drawnCard();
    }

    public void requireActor(PlayerId player) {
        if (!turn.isActor(player)) {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }
    }

    public void requireStage(UnoStage... stages) {
        if (!turn.isIn(stages)) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
    }

    // R12: DRAWN 단계에서는 방금 뽑은 카드만 낼 수 있다.
    public void requireDrawnOrAny(CardId card) {
        if (turn.isIn(UnoStage.DRAWN) && !card.equals(turn.drawn())) {
            throw new BusinessException(ErrorCode.UNO_ONLY_DRAWN_CARD);
        }
    }
}
