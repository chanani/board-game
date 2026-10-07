package com.boardgame.room.application;

import com.boardgame.member.application.AvatarLookup;
import com.boardgame.member.domain.Avatar;
import com.boardgame.member.domain.AvatarBook;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * 방 사람들의 프로필 그림을 메모리에 둔다. DB는 방에 들어올 때(만들기·참가·관전) 방 잠금 밖에서 한 번만 읽고,
 * 그림을 바꾸면 커밋 뒤 이벤트로 고친다. 방송(잠금 안)은 메모리만 읽는다.
 */
@Component
public class RoomAvatars {

    private final AvatarLookup lookup;
    private final Map<Long, Avatar> known = new ConcurrentHashMap<>();

    public RoomAvatars(AvatarLookup lookup) {
        this.lookup = lookup;
    }

    public void load(long memberId) {
        known.put(memberId, lookup.avatarOf(memberId));
    }

    public void remember(long memberId, Avatar avatar) {
        known.put(memberId, avatar);
    }

    /** 메모리에 없는 사람은 id로 정한 기본 그림. */
    public AvatarBook bookOf(Collection<Long> memberIds) {
        return AvatarBook.from(memberIds.stream()
                .filter(known::containsKey)
                .distinct()
                .collect(Collectors.toMap(Function.identity(), known::get)));
    }
}
