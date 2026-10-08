package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

// R26: 중 — 점수가 낮거나 짝을 만들거나 와일드인 버린 카드를 가져오고, 바꿨을 때 점수가 가장 많이 줄어드는 칸에 넣는다.
class MediumSafari implements SafariPlayer {

    private static final int LOW_SCORE = 3;

    @Override
    public GameAction flip(SafariSight sight, Random random) {
        return SafariAuto.flip(sight, random);
    }

    @Override
    public GameAction draw(SafariSight sight, Random random) {
        boolean take = sight.discardTop()
                .filter(card -> worthTaking(sight, card))
                .isPresent();
        if (take) {
            return SafariMoves.drawDiscard();
        }
        return SafariMoves.drawDeck();
    }

    // 줄어드는 칸이 없으면 덱 카드는 버리고, 버린 더미 카드(와 타잔)는 손해가 가장 적은 칸에 넣는다.
    @Override
    public GameAction place(SafariSight sight, Random random) {
        Choice best = rank(sight, sight.heldCard()).get(0);
        if (best.gain() > 0 || !SafariMoves.canDiscard(sight)) {
            return SafariMoves.swap(best.slot());
        }
        return SafariMoves.discard();
    }

    // 짝 정보가 가장 많이 생기는 뒷면 칸(같은 열 반대쪽을 아는 칸 우선).
    @Override
    public GameAction peek(SafariSight sight, Random random) {
        List<SlotView> unknown = sight.myFaceDown()
                .stream()
                .filter(slot -> !slot.known())
                .toList();
        List<SlotView> informative = unknown.stream()
                .filter(sight::partnerKnown)
                .toList();
        return SafariMoves.peek(SafariAuto.pick(firstNonEmpty(informative, unknown, sight.myFaceDown()), random));
    }

    // R28: 하·중은 덱 전체 평균을 쓴다.
    protected double unknownAverage(SafariSight sight) {
        return CardOdds.DECK_AVERAGE;
    }

    // 이득이 큰 순서(같으면 칸 순서).
    protected List<Choice> rank(SafariSight sight, CardView card) {
        BoardGuess board = BoardGuess.of(sight.myBoard(), unknownAverage(sight));
        double before = board.total();
        return sight.mySlots()
                .stream()
                .map(slot -> new Choice(slot, before - board.with(slot, card).total(), board.worthAt(slot)))
                .sorted(Comparator.comparingDouble(Choice::gain).reversed())
                .toList();
    }

    private boolean worthTaking(SafariSight sight, CardView card) {
        return card.value() <= LOW_SCORE || card.kind() == CardKind.WILD || sight.pairsWithMine(card);
    }

    @SafeVarargs
    private static List<SlotView> firstNonEmpty(List<SlotView>... candidates) {
        return Arrays.stream(candidates)
                .filter(list -> !list.isEmpty())
                .findFirst()
                .orElseThrow();
    }
}
