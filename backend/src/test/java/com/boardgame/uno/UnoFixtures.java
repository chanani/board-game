package com.boardgame.uno;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

final class UnoFixtures {

    static final PlayerId A = new PlayerId(1L);
    static final PlayerId B = new PlayerId(2L);
    static final PlayerId C = new PlayerId(3L);
    static final PlayerId D = new PlayerId(4L);

    private static final List<UnoCard> DECK = StandardUnoDeck.cards();

    private UnoFixtures() {
    }

    static UnoCard num(UnoColor color, int number) {
        return num(color, number, 0);
    }

    static UnoCard num(UnoColor color, int number, int copy) {
        return find(CardFace.number(color, number), copy);
    }

    static UnoCard skip(UnoColor color) {
        return skip(color, 0);
    }

    static UnoCard skip(UnoColor color, int copy) {
        return find(CardFace.action(CardKind.SKIP, color), copy);
    }

    static UnoCard reverse(UnoColor color) {
        return reverse(color, 0);
    }

    static UnoCard reverse(UnoColor color, int copy) {
        return find(CardFace.action(CardKind.REVERSE, color), copy);
    }

    static UnoCard drawTwo(UnoColor color) {
        return drawTwo(color, 0);
    }

    static UnoCard drawTwo(UnoColor color, int copy) {
        return find(CardFace.action(CardKind.DRAW_TWO, color), copy);
    }

    static UnoCard wild(int copy) {
        return find(CardFace.wild(CardKind.WILD), copy);
    }

    static UnoCard wildFour(int copy) {
        return find(CardFace.wild(CardKind.WILD_DRAW_FOUR), copy);
    }

    /** 뽑을 더미 채우기용 노랑 숫자 카드(앞에서부터 count장, 0점·1점·1점·2점…). 테스트의 다른 카드에는 노랑 숫자를 쓰지 않는다. */
    static List<UnoCard> filler(int count) {
        return DECK.stream()
                .filter(card -> card.isColor(UnoColor.YELLOW) && card.kind() == CardKind.NUMBER)
                .limit(count)
                .toList();
    }

    private static UnoCard find(CardFace face, int copy) {
        return DECK.stream()
                .filter(card -> card.face().equals(face))
                .skip(copy)
                .findFirst()
                .orElseThrow();
    }

    /** R6 순서로 쌓는다: 손패를 seat 0부터 한 장씩 돌려 놓고, 다음이 첫 카드, 그 뒤가 뽑을 더미(앞에서부터 뽑힌다). 손패 장수는 모두 같아야 한다. */
    static List<UnoCard> stack(List<List<UnoCard>> hands, UnoCard first, List<UnoCard> drawPile) {
        List<UnoCard> stack = new ArrayList<>();
        int size = hands.get(0).size();
        IntStream.range(0, size).forEach(round -> hands.forEach(hand -> stack.add(hand.get(round))));
        stack.add(first);
        stack.addAll(drawPile);
        return stack;
    }

    static UnoRoundFactory factory(List<List<UnoCard>> hands, UnoCard first, List<UnoCard> drawPile, int starterSeat) {
        StackedUnoShuffler shuffler = StackedUnoShuffler.of(stack(hands, first, drawPile));
        return new UnoRoundFactory(shuffler, count -> starterSeat, hands.get(0).size());
    }

    static UnoGame game(List<PlayerId> players, List<List<UnoCard>> hands, UnoCard first, List<UnoCard> drawPile, int starterSeat) {
        return UnoGame.start(players, factory(hands, first, drawPile, starterSeat));
    }

    /** 시작 사람 = seat 0. */
    static UnoGame game(List<PlayerId> players, List<List<UnoCard>> hands, UnoCard first, List<UnoCard> drawPile) {
        return game(players, hands, first, drawPile, 0);
    }
}
