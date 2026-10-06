// 한 저장소(backend/, frontend/)에서 백엔드·프론트 이미지를 각각 만들어 홈서버 Docker로 띄운다.
// 비밀번호는 여기에 쓰지 않는다. Jenkins 관리 > Credentials에 "Secret text"로 등록한 ID를 credentials()로 불러온다.
pipeline {
    agent any

    environment {
        BACK_NAME  = 'board-game-back'
        FRONT_NAME = 'board-game-front'
        // 같은 Docker 네트워크(appnet)에 있어 컨테이너 이름으로 서로 찾는다(mysql-master 포함).
        DOCKER_NETWORK = 'appnet'

        // 스키마만 boardgame. 처음 접속할 때 스키마가 없으면 만든다(createDatabaseIfNotExist).
        DB_URL      = 'jdbc:mysql://mysql-master:3306/boardgame?serverTimezone=Asia/Seoul&useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&createDatabaseIfNotExist=true'
        DB_USERNAME = 'root'
        DB_PASSWORD = credentials('board-game-db-password')

        // 브라우저로 접속하는 주소(오리진)를 쉼표로. 실제 도메인·포트에 맞게 고친다.
        WS_ORIGINS    = 'https://*.chanhan.cloud,http://localhost:[*]'
        // https로 서비스하면 'true'.
        COOKIE_SECURE = 'false'

        BACK_PORT  = '8899'
        FRONT_PORT = '5177'
    }

    stages {
        stage('Git Pull') {
            steps {
                git branch: 'main',
                    credentialsId: 'chanhan',
                    url: 'https://github.com/chanani/board-game.git'
            }
        }

        // 두 이미지는 서로 독립이라 함께 만든다. 각 폴더를 빌드 컨텍스트로 쓴다.
        stage('Docker Build') {
            parallel {
                stage('Backend') {
                    steps {
                        sh 'docker build -t ${BACK_NAME} ./backend'
                    }
                }
                stage('Frontend') {
                    steps {
                        sh 'docker build -t ${FRONT_NAME} ./frontend'
                    }
                }
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                docker stop ${BACK_NAME} || true
                docker rm ${BACK_NAME} || true
                docker run -d \
                  --name ${BACK_NAME} \
                  --network ${DOCKER_NETWORK} \
                  --restart unless-stopped \
                  -e SPRING_PROFILES_ACTIVE=prod \
                  -e DB_URL="${DB_URL}" \
                  -e DB_USERNAME="${DB_USERNAME}" \
                  -e DB_PASSWORD="${DB_PASSWORD}" \
                  -e COOKIE_SECURE="${COOKIE_SECURE}" \
                  -e APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS="${WS_ORIGINS}" \
                  -e TZ=Asia/Seoul \
                  -e JAVA_TOOL_OPTIONS="-Xms256m -Xmx512m" \
                  -p ${BACK_PORT}:8899 \
                  ${BACK_NAME}
                '''
            }
        }

        // 프론트 nginx가 /api, /ws를 백엔드 컨테이너로 넘긴다(브라우저는 프론트 주소 하나만 쓴다).
        stage('Deploy Frontend') {
            steps {
                sh '''
                docker stop ${FRONT_NAME} || true
                docker rm ${FRONT_NAME} || true
                docker run -d \
                  --name ${FRONT_NAME} \
                  --network ${DOCKER_NETWORK} \
                  --restart unless-stopped \
                  -e BACKEND_ORIGIN=http://${BACK_NAME}:8899 \
                  -p ${FRONT_PORT}:80 \
                  ${FRONT_NAME}
                '''
            }
        }

        stage('Cleanup') {
            steps {
                // 이름 없는 옛 이미지 정리(실패해도 배포는 끝난 상태).
                sh 'docker image prune -f || true'
            }
        }
    }
}
