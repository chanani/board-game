package com.boardgame.uno;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.IntStream;

// 섞기·나눠 주기·첫 카드 처리(R5~R7).
public class UnoRoundFactory {

    static final int HAND_SIZE = 7;

    private final UnoShuffler shuffler;
    private final StarterPicker starterPicker;
    private final int handSize;

    public UnoRoundFactory(UnoShuffler shuffler, StarterPicker starterPicker) {
        this(shuffler, starterPicker, HAND_SIZE);
    }

    // 테스트 전용: 손패 장수를 줄여 우노·게임 끝 상황을 빨리 만든다.
    UnoRoundFactory(UnoShuffler shuffler, StarterPicker starterPicker, int handSize) {
        this.shuffler = shuffler;
        this.starterPicker = starterPicker;
        this.handSize = handSize;
    }

    public static UnoRoundFactory random() {
        return new UnoRoundFactory(new RandomUnoShuffler(), count -> ThreadLocalRandom.current().nextInt(count));
    }

    public UnoRound create(List<PlayerId> players, EventBatch events) {
        DrawPile pile = new DrawPile(shuffler.shuffle(StandardUnoDeck.cards()), shuffler);
        Hands hands = deal(players, pile);
        UnoCard first = flipFirst(pile, events);
        PlayerId starter = players.get(starterPicker.pick(players.size()));
        UnoPlayers seated = new UnoPlayers(hands, new TurnOrder(players, starter), new UnoCalls());
        UnoRound round = new UnoRound(new UnoTable(pile, new DiscardPile(first)), seated, new UnoProgress(Turn.play(starter)));
        round.openWith(first, events);
        return round;
    }

    // R6: seat 0부터 한 장씩 handSize 바퀴.
    private Hands deal(List<PlayerId> players, DrawPile pile) {
        Map<PlayerId, List<UnoCard>> dealt = new LinkedHashMap<>();
        players.forEach(player -> dealt.put(player, new ArrayList<>()));
        IntStream.range(0, handSize).forEach(round -> players.forEach(player -> dealt.get(player).add(pile.take())));
        Map<PlayerId, Hand> hands = new LinkedHashMap<>();
        dealt.forEach((player, cards) -> hands.put(player, new Hand(cards)));
        return new Hands(hands);
    }

    // R7: 첫 카드가 +4면 더미에 다시 넣고 섞어 다시 뒤집는다.
    private UnoCard flipFirst(DrawPile pile, EventBatch events) {
        UnoCard card = pile.take();
        while (card.kind() == CardKind.WILD_DRAW_FOUR) {
            events.add(UnoEvent.firstCardRedrawn(card));
            pile.reshuffleWith(card);
            card = pile.take();
        }
        return card;
    }
}
