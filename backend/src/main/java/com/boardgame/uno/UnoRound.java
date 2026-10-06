package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;

// 한 판의 애그리거트. 모든 규칙 메서드가 여기에 있다(Task 3~6이 더한다).
public class UnoRound {

    static final int NEXT = 1;
    static final int SKIP_ONE = 2;
    private static final int DRAW_TWO_COUNT = 2;
    private static final int TWO_PLAYERS = 2;
    private static final int FOUR = 4;
    private static final int CHALLENGE_PENALTY = 2;
    private static final int UNO_PENALTY = 2;

    private final UnoTable table;
    private final UnoPlayers players;
    private final UnoProgress progress;

    UnoRound(UnoTable table, UnoPlayers players, UnoProgress progress) {
        this.table = table;
        this.players = players;
        this.progress = progress;
    }

    // R7: 첫 카드 효과를 적용하고, 효과 이벤트 뒤에 START(첫 차례 사람, 첫 카드)를 남긴다.
    void openWith(UnoCard first, EventBatch events) {
        switch (first.kind()) {
            case SKIP -> skipStarter(events);
            case REVERSE -> reverseAtStart(events);
            case DRAW_TWO -> drawTwoAtStart(events);
            case WILD -> progress.begin(Turn.chooseColor(players.current()));
            case NUMBER -> progress.begin(Turn.play(players.current()));
            case WILD_DRAW_FOUR -> throw new IllegalStateException("WILD_DRAW_FOUR는 첫 카드가 될 수 없다");
        }
        events.add(UnoEvent.start(players.current(), first));
    }

    private void skipStarter(EventBatch events) {
        events.add(UnoEvent.skip(players.current()));
        passTurn(NEXT);
    }

    // 3명 이상이면 반대 방향으로 딜러(starter 바로 앞 사람)부터. 2명이면 starter가 차례를 잃는 것과 같다.
    private void reverseAtStart(EventBatch events) {
        if (players.size() == TWO_PLAYERS) {
            skipStarter(events);
            return;
        }
        players.reverse();
        events.add(UnoEvent.reverse(null));
        passTurn(NEXT);
    }

    private void drawTwoAtStart(EventBatch events) {
        penalize(players.current(), DRAW_TWO_COUNT, UnoEventReason.DRAW_TWO, events);
        passTurn(NEXT);
    }

    // 벌칙으로 뽑게 한다. 더미가 모자라면 실제로 뽑은 장수만 기록한다(R14).
    void penalize(PlayerId target, int count, UnoEventReason reason, EventBatch events) {
        List<UnoCard> drawn = table.draw(count, events);
        players.give(target, drawn);
        events.add(UnoEvent.penalty(target, drawn.size(), reason));
    }

    // 차례를 넘긴다. steps 1 = 다음 사람, 2 = 한 사람 건너뜀. 같은 사람이 다시 해도 새 단계(새 순번)다.
    void passTurn(int steps) {
        players.endTurn();
        players.advance(steps);
        progress.begin(Turn.play(players.current()));
    }

    // R8~R10
    public void play(PlayerId player, CardId cardId, ChosenColor chosen, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.PLAY, UnoStage.DRAWN);
        UnoCard card = players.cardOf(player, cardId);
        progress.requireDrawnOrAny(cardId);
        requirePlayable(card);
        UnoColor color = colorFor(card, chosen);
        boolean legalFour = holdsNoActiveColor(player);
        players.closeCatch();
        players.discardFrom(player, cardId);
        table.discard(card, color);
        events.add(UnoEvent.play(player, card, chosenColorOf(card, color)));
        players.settleUno(player);
        resolve(player, card, legalFour, events);
    }

    // R11: 낼 때(손에서 빼기 전, 새 색을 칠하기 전) 현재 색 카드가 없었는지. 현재 색이 없으면 합법.
    private boolean holdsNoActiveColor(PlayerId player) {
        return table.color()
                .map(color -> !players.holdsColor(player, color))
                .orElse(true);
    }

    private void requirePlayable(UnoCard card) {
        if (!table.accepts(card)) {
            throw new BusinessException(ErrorCode.UNO_CARD_NOT_PLAYABLE);
        }
    }

    // R10: 와일드는 같은 행동에 실린 색이 필수, 그 밖에는 카드 색.
    private UnoColor colorFor(UnoCard card, ChosenColor chosen) {
        if (card.isWild()) {
            return chosen.require();
        }
        return card.color();
    }

    private UnoColor chosenColorOf(UnoCard card, UnoColor color) {
        if (card.isWild()) {
            return color;
        }
        return null;
    }

    // R15~R18
    void resolve(PlayerId player, UnoCard card, boolean legalFour, EventBatch events) {
        switch (card.kind()) {
            case SKIP -> skipNext(events);
            case REVERSE -> reverse(player, events);
            case DRAW_TWO -> drawTwoNext(events);
            case WILD_DRAW_FOUR -> awaitChallenge(new FourCharge(player, legalFour, players.cardsOf(player)));
            case NUMBER, WILD -> passTurn(NEXT);
        }
    }

    // R18: 다음 사람(받는 사람)이 도전할지 고른다.
    private void awaitChallenge(FourCharge charge) {
        progress.charge(charge);
        players.endTurn();
        players.advance(NEXT);
        progress.begin(Turn.challenge(players.current()));
    }

    // R20·R21·R22
    public void challenge(PlayerId player, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.CHALLENGE);
        players.closeCatch();
        FourCharge charge = progress.takeCharge();
        progress.reveal(new ChallengeReveal(player, charge));
        if (charge.legal()) {
            challengeFails(player, charge, events);
            return;
        }
        challengeSucceeds(player, charge, events);
    }

    // R20: 낸 사람이 4장. +4 카드와 고른 색은 그대로, 받는 사람이 정상 차례를 한다(D9).
    private void challengeSucceeds(PlayerId challenger, FourCharge charge, EventBatch events) {
        events.add(UnoEvent.challenge(challenger, charge.by(), UnoEventReason.GUILTY));
        penalize(charge.by(), FOUR, UnoEventReason.CHALLENGE_GUILTY, events);
        progress.begin(Turn.play(challenger));
    }

    // R21: 받는 사람이 6장을 뽑고 차례를 잃는다.
    private void challengeFails(PlayerId challenger, FourCharge charge, EventBatch events) {
        events.add(UnoEvent.challenge(challenger, charge.by(), UnoEventReason.INNOCENT));
        penalize(challenger, FOUR + CHALLENGE_PENALTY, UnoEventReason.CHALLENGE_FAILED, events);
        passTurn(NEXT);
    }

    // R19
    public void accept(PlayerId player, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.CHALLENGE);
        players.closeCatch();
        progress.takeCharge();
        penalize(player, FOUR, UnoEventReason.WILD_DRAW_FOUR, events);
        passTurn(NEXT);
    }

    // R23·R27: 내 차례(PLAY/DRAWN)에 2장이면 외친다. 잡기 창의 대상 본인이면 언제든 늦게 외쳐 선언된다.
    public void callUno(PlayerId player, EventBatch events) {
        if (players.isCatchable(player)) {
            players.declareLate(player);
            events.add(UnoEvent.unoCall(player));
            return;
        }
        progress.requireActor(player);
        progress.requireStage(UnoStage.PLAY, UnoStage.DRAWN);
        requireCallable(player);
        players.call(player);
        events.add(UnoEvent.unoCall(player));
    }

    private void requireCallable(PlayerId player) {
        if (!players.canCall(player)) {
            throw new BusinessException(ErrorCode.UNO_CALL_NOT_ALLOWED);
        }
    }

    // R26: 창이 열려 있고 대상이 맞고 본인이 아니면, 먼저 도착한 한 명만 성공한다. 차례·마감에는 영향이 없다.
    public void catchUno(PlayerId catcher, PlayerId target, EventBatch events) {
        if (!players.isCatchable(target) || catcher.equals(target)) {
            throw new BusinessException(ErrorCode.UNO_CATCH_CLOSED);
        }
        players.closeCatch();
        events.add(UnoEvent.unoCaught(catcher, target));
        penalize(target, UNO_PENALTY, UnoEventReason.UNO_CAUGHT, events);
    }

    public boolean canCallUno(PlayerId viewer) {
        if (players.isCatchable(viewer)) {
            return true;
        }
        return progress.isActorIn(viewer, UnoStage.PLAY, UnoStage.DRAWN) && players.canCall(viewer);
    }

    public boolean canCatch(PlayerId viewer) {
        return players.contains(viewer) && players.catchTarget()
                .filter(target -> !target.equals(viewer))
                .isPresent();
    }

    public Optional<FourCharge> pendingCharge() {
        return progress.pendingCharge();
    }

    public boolean isChargedBy(PlayerId player) {
        return progress.pendingCharge()
                .filter(charge -> charge.isBy(player))
                .isPresent();
    }

    public void clearCharge() {
        progress.clearCharge();
    }

    public Optional<ChallengeReveal> revealFor(PlayerId viewer) {
        return progress.revealFor(viewer);
    }

    // R22: 도전 처리 직후 상태에서만 공개한다.
    void forgetRevealUnless(EventBatch batch) {
        if (batch.has(UnoEventType.CHALLENGE)) {
            return;
        }
        progress.forgetReveal();
    }

    private void skipNext(EventBatch events) {
        events.add(UnoEvent.skip(players.nextOf(players.current())));
        passTurn(SKIP_ONE);
    }

    // R16: 2명이면 건너뛰기와 같다(방향 값은 그대로).
    private void reverse(PlayerId player, EventBatch events) {
        if (players.size() == TWO_PLAYERS) {
            skipNext(events);
            return;
        }
        players.reverse();
        events.add(UnoEvent.reverse(player));
        passTurn(NEXT);
    }

    private void drawTwoNext(EventBatch events) {
        penalize(players.nextOf(players.current()), DRAW_TWO_COUNT, UnoEventReason.DRAW_TWO, events);
        passTurn(SKIP_ONE);
    }

    // R12·R14
    public void draw(PlayerId player, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.PLAY);
        players.closeCatch();
        List<UnoCard> drawn = table.draw(1, events);
        if (drawn.isEmpty()) {
            events.add(UnoEvent.pass(player, UnoEventReason.EMPTY_PILE));
            passTurn(NEXT);
            return;
        }
        players.give(player, drawn);
        events.add(UnoEvent.draw(player));
        offerDrawn(player, drawn.get(0), events);
    }

    private void offerDrawn(PlayerId player, UnoCard card, EventBatch events) {
        if (table.accepts(card)) {
            progress.begin(Turn.drawn(player, card.id()));
            return;
        }
        events.add(UnoEvent.pass(player, UnoEventReason.NO_PLAYABLE));
        passTurn(NEXT);
    }

    // R12: 뽑은 카드를 갖고 넘긴다.
    public void keep(PlayerId player, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.DRAWN);
        players.closeCatch();
        events.add(UnoEvent.pass(player, UnoEventReason.KEEP));
        passTurn(NEXT);
    }

    public PlayerId actor() {
        return progress.actor();
    }

    public UnoStage stage() {
        return progress.stage();
    }

    public StageSeq stageSeq() {
        return progress.seq();
    }

    public Direction direction() {
        return players.direction();
    }

    public Optional<UnoColor> currentColor() {
        return table.color();
    }

    public UnoCard discardTop() {
        return table.top();
    }

    public int discardSize() {
        return table.discardSize();
    }

    public int drawPileSize() {
        return table.drawPileSize();
    }

    public List<UnoCard> handOf(PlayerId player) {
        return players.cardsOf(player);
    }

    public int cardCount(PlayerId player) {
        return players.countOf(player);
    }

    public List<PlayerId> remaining() {
        return players.seats();
    }

    public boolean isRemaining(PlayerId player) {
        return players.contains(player);
    }

    public boolean isDeclared(PlayerId player) {
        return players.isDeclared(player);
    }

    public Optional<PlayerId> catchTarget() {
        return players.catchTarget();
    }
}
