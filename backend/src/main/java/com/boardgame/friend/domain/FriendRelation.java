package com.boardgame.friend.domain;

/** 나와 찾은 사람의 사이. REQUEST_SENT: 내가 보내고 기다리는 중, REQUEST_RECEIVED: 그 사람이 나에게 보냈다. */
public enum FriendRelation {
    NONE,
    FRIEND,
    REQUEST_SENT,
    REQUEST_RECEIVED,
    SELF
}
