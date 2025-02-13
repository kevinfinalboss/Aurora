FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download


COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest

RUN apk add --no-cache ffmpeg python3

WORKDIR /app

COPY --from=builder /app/main .

COPY --from=builder /app/config.yaml .
COPY --from=builder /app/events ./events
COPY --from=builder /app/commands ./commands
COPY --from=builder /app/internal ./internal
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/api ./api
COPY --from=builder /app/config ./config

RUN chmod +x /app/main

EXPOSE 80

CMD ["./main"]