package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.IntStream;

// R24·R27: 상 — 중에 남은 카드 기대값, 판을 끝내는 수의 조건, 타잔 밀어내기, 와일드·여우 자리를 더한다.
final class HardSafari extends MediumSafari {

    private static final double SAFE_MARGIN = 2.0;
    // 모두가 상이면 아무도 판을 끝내지 않을 수 있다. 내 놓기가 PATIENCE번을 넘으면 지지 않을 때 끝내고, LIMIT번을 넘으면 가리지 않는다.
    private static final int PATIENCE = 20;
    private static final int LIMIT = 30;
    private static final int ROWS = 2;
    private static final int COLUMNS = 3;

    private final SeenCards seen;
    private int placements;

    HardSafari(SeenCards seen) {
        this.seen = seen;
    }

    // R24: 위·아래 줄 중 한 줄을 고르게 고른 뒤 그 줄의 뒷면 칸.
    @Override
    public GameAction flip(SafariSight sight, Random random) {
        int row = random.nextInt(ROWS);
        List<SlotView> line = sight.myFaceDown()
                .stream()
                .filter(slot -> slot.row() == row)
                .toList();
        if (line.isEmpty()) {
            return SafariAuto.flip(sight, random);
        }
        return SafariMoves.flip(SafariAuto.pick(line, random));
    }

    @Override
    public GameAction place(SafariSight sight, Random random) {
        placements++;
        return super.place(sight, random);
    }

    @Override
    protected double unknownAverage(SafariSight sight) {
        return CardOdds.remainingAverage(seen.seenWith(sight));
    }

    @Override
    protected List<Choice> rank(SafariSight sight, CardView card) {
        List<Choice> ordered = tarzanFirst(sight, super.rank(sight, card));
        List<Choice> allowed = ordered.stream()
                .filter(choice -> mayEnd(sight, choice, card))
                .toList();
        List<Choice> usable = allowed.isEmpty() ? ordered : allowed;
        return lowCardToBigColumn(sight, card, usable);
    }

    // R27: 같은 이득이면 밀려나는 카드 점수가 높은 칸(타잔으로 왼쪽 사람 판에 간다).
    static List<Choice> preferPushingHigh(List<Choice> choices) {
        return choices.stream()
                .sorted(Comparator.comparingDouble(Choice::gain).reversed()
                        .thenComparing(Comparator.comparingDouble(Choice::pushed).reversed()))
                .toList();
    }

    private List<Choice> tarzanFirst(SafariSight sight, List<Choice> ranked) {
        if (!sight.heldFromDeck() || !sight.heldIs(CardKind.TARZAN)) {
            return ranked;
        }
        return preferPushingHigh(ranked);
    }

    // R27: 마지막 뒷면 칸을 채워 판을 끝내는 수는 다른 사람들(보이는 점수 + 뒷면 기대값)보다 2점 이상 낮을 때만.
    private boolean mayEnd(SafariSight sight, Choice choice, CardView card) {
        if (!endsRound(sight, choice) || placements > LIMIT) {
            return true;
        }
        double margin = placements > PATIENCE ? 0 : SAFE_MARGIN;
        return myFinalScore(sight, choice, card) <= bestOpponentGuess(sight) - margin;
    }

    private boolean endsRound(SafariSight sight, Choice choice) {
        List<SlotView> faceDown = sight.myFaceDown();
        return faceDown.size() == 1 && faceDown.contains(choice.slot());
    }

    private double myFinalScore(SafariSight sight, Choice choice, CardView card) {
        BoardGuess board = BoardGuess.of(sight.myBoard(), unknownAverage(sight));
        return board.with(choice.slot(), card).total();
    }

    private double bestOpponentGuess(SafariSight sight) {
        double unknown = unknownAverage(sight);
        return sight.opponents()
                .stream()
                .mapToDouble(board -> BoardGuess.of(board, unknown).total())
                .min()
                .orElse(Double.MAX_VALUE);
    }

    // R27: 와일드·여우(-2)는 짝이 없는 열 중 합이 가장 큰 열의 더 큰 칸에 넣는다.
    private List<Choice> lowCardToBigColumn(SafariSight sight, CardView card, List<Choice> choices) {
        if (card.kind() != CardKind.WILD && card.kind() != CardKind.FOX) {
            return choices;
        }
        BoardGuess board = BoardGuess.of(sight.myBoard(), unknownAverage(sight));
        return IntStream.range(0, COLUMNS)
                .filter(column -> !board.isPaired(column))
                .boxed()
                .max(Comparator.comparingDouble(board::columnSum))
                .map(column -> withFront(choices, column))
                .orElse(choices);
    }

    private static List<Choice> withFront(List<Choice> choices, int column) {
        Optional<Choice> target = choices.stream()
                .filter(choice -> choice.slot().column() == column)
                .max(Comparator.comparingDouble(Choice::pushed));
        if (target.isEmpty()) {
            return choices;
        }
        List<Choice> reordered = new ArrayList<>();
        reordered.add(target.get());
        choices.stream()
                .filter(choice -> !choice.equals(target.get()))
                .forEach(reordered::add);
        return reordered;
    }
}
