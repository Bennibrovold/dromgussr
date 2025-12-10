import { useEffect, useState } from "react";
import styled from "styled-components";

const BASE_URL = "http://109.110.36.201:1121";
const TOTAL_ROUNDS = 5;

type Car = {
  image: { src: string; _id: string; src2x: string; alt: string };
  title?: string;
  year?: number;
  price?: number;
  initialPriceRub?: number;
  images?: {
    _id: string;
    src2x: string;
    src: string;
    alt: string;
  }[];
  description: string[];
  // Server may attach more metadata later.
};

type Breakdown = {
  priceScore: number;
  modelScore: number;
  error: number | null;
  correct?: Car | null;
};

const formatPrice = (value?: number) =>
  typeof value === "number" ? value.toLocaleString("ru-RU") : "-";

function formatNumber(value: number) {
  return value.toLocaleString("ru-RU");
}

function parseFormatted(value: string): number {
  return Number(value.replace(/\D/g, ""));
}

export default function Game() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [priceGuess, setPriceGuess] = useState<number | "">("");
  const [modelGuess, setModelGuess] = useState("");
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function loadCar() {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/random-car`);
      const json = await res.json();
      setCar(json);
      setPriceGuess("");
      setModelGuess("");
      setRoundScore(0);
      setBreakdown(null);
      setActiveImageIndex(0);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!car) return;
    try {
      setSubmitting(true);

      const res = await fetch(`${BASE_URL}/api/guess`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          guessPrice: Number(priceGuess),
          guessModel: modelGuess,
          correct: car,
        }),
      });

      const data = await res.json();
      const normalizedTotal =
        typeof data.totalScore === "number" && Number.isFinite(data.totalScore)
          ? data.totalScore
          : 0;
      const normalizedPrice =
        typeof data.priceScore === "number" && Number.isFinite(data.priceScore)
          ? data.priceScore
          : 0;
      const normalizedModel =
        typeof data.modelScore === "number" && Number.isFinite(data.modelScore)
          ? data.modelScore
          : 0;
      const normalizedError =
        typeof data.error === "number" && Number.isFinite(data.error)
          ? data.error
          : null;

      setRoundScore(normalizedTotal);
      setScore((prev) => prev + normalizedTotal);

      setBreakdown({
        priceScore: normalizedPrice,
        modelScore: normalizedModel,
        error: normalizedError,
        correct: data.correct ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleNextRound() {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      return;
    }

    setRound((prev) => prev + 1);
    loadCar();
  }

  function restartGame() {
    setScore(0);
    setRoundScore(0);
    setBreakdown(null);
    setRound(1);
    setGameOver(false);
    loadCar();
  }

  useEffect(() => {
    loadCar();
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (modelGuess.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      const res = await fetch(
        `${BASE_URL}/api/search-models?q=` + encodeURIComponent(modelGuess)
      );

      const list = await res.json();
      setSuggestions(list);
      setShowSuggestions(true);
    }, 200);

    return () => clearTimeout(handler);
  }, [modelGuess]);

  const normalizedScore = Number.isFinite(score) ? score : 0;
  const formattedScore = normalizedScore.toLocaleString("ru-RU");
  const correctPrice =
    breakdown?.correct?.price ?? breakdown?.correct?.initialPriceRub;
  const correctYear = breakdown?.correct?.year ?? "-";
  const correctTitle = breakdown?.correct?.title ?? "-";
  const errorValue = breakdown?.error;
  const errorPercent =
    typeof errorValue === "number" && Number.isFinite(errorValue)
      ? `${(errorValue * 100).toFixed(1)}%`
      : "-";
  const roundLabel = Math.min(round, TOTAL_ROUNDS);

  if (gameOver) {
    return (
      <Page>
        <GameCard>
          <Title>Игра закончена</Title>
          <RoundIndicator>Все {TOTAL_ROUNDS} ранды завершены</RoundIndicator>
          <Hint>Спасибо за игру.</Hint>
          <TotalRow>
            <TotalLabel>Финальные очки</TotalLabel>
            <TotalScore>{formattedScore}</TotalScore>
          </TotalRow>
          <ActionsRow>
            <PrimaryButton onClick={restartGame}>Играть снова</PrimaryButton>
          </ActionsRow>
        </GameCard>
      </Page>
    );
  }

  if (!car || loading) {
    return (
      <Page>
        <GameCard>
          <Title>Угадай цену и модель</Title>
          <LoadingBlock>Загрузка машины…</LoadingBlock>
        </GameCard>
      </Page>
    );
  }

  const images = car?.images ?? [car.image];
  const activeImage = images[activeImageIndex];

  return (
    <Page>
      <GameCard>
        <Title>Угадай цену и модель</Title>
        <RoundIndicator>
          Раунд {roundLabel} / {TOTAL_ROUNDS}
        </RoundIndicator>

        <CarBlock>
          <GalleryWrapper>
            <BigImage
              key={activeImage?._id}
              src={activeImage?.src2x}
              alt={activeImage?.alt || car.title}
            />

            {images.length > 1 && (
              <ThumbStrip>
                {images.map((img, i) => (
                  <Thumb
                    key={img._id || i}
                    onClick={() => setActiveImageIndex(i)}
                    $active={i === activeImageIndex}
                  >
                    <ThumbImg src={img.src} alt={img.alt || car.title} />
                  </Thumb>
                ))}
              </ThumbStrip>
            )}

            {images.length > 1 && (
              <>
                <NavButtonLeft
                  onClick={() =>
                    setActiveImageIndex(
                      (i) => (i - 1 + images.length) % images.length
                    )
                  }
                >
                  ‹
                </NavButtonLeft>

                <NavButtonRight
                  onClick={() =>
                    setActiveImageIndex((i) => (i + 1) % images.length)
                  }
                >
                  ›
                </NavButtonRight>
              </>
            )}
          </GalleryWrapper>

          <CarInfo>
            <CarTitle>Год {car.year ?? "-"}</CarTitle>

            <ul>
              {car.description.map((x, i) => (i < 5 ? <li>{x}</li> : null))}
            </ul>

            <InputsGrid>
              <Field>
                <Label>Цена, ₽</Label>
                <InputWrapper>
                  <Icon>💸</Icon>
                  <FancyInput
                    type="text"
                    value={priceGuess === "" ? "" : formatNumber(priceGuess)}
                    onChange={(e) => {
                      const numeric = parseFormatted(e.target.value);
                      setPriceGuess(numeric === 0 ? "" : numeric);
                    }}
                    placeholder="750 000"
                  />
                </InputWrapper>
              </Field>

              <Field>
                <Label>Модель</Label>
                <InputWrapper>
                  <Icon>🚗</Icon>
                  <FancyInput
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    type="text"
                    value={modelGuess}
                    onChange={(e) => setModelGuess(e.target.value)}
                    placeholder="Impreza, Crown…"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <SuggestBox>
                      {suggestions.map((item) => (
                        <SuggestItem
                          key={item}
                          onClick={() => {
                            setModelGuess(item);
                            setShowSuggestions(false);
                          }}
                        >
                          {item}
                        </SuggestItem>
                      ))}
                    </SuggestBox>
                  )}
                </InputWrapper>
              </Field>
            </InputsGrid>

            <ActionsRow>
              <PrimaryButton
                onClick={submit}
                disabled={
                  submitting ||
                  !!breakdown ||
                  priceGuess === "" ||
                  modelGuess.trim().length === 0
                }
              >
                {submitting ? "Проверяем..." : "Отправить"}
              </PrimaryButton>

              <SecondaryButton
                onClick={handleNextRound}
                disabled={submitting || loading}
              >
                {round === TOTAL_ROUNDS
                  ? "Завершить"
                  : "Пропустить / Следующая машина"}
              </SecondaryButton>
            </ActionsRow>
          </CarInfo>
        </CarBlock>

        {breakdown && (
          <ResultSection>
            <RoundScore>
              Round score: <span>{roundScore}</span> pts
            </RoundScore>

            <ScoreGrid>
              <ScoreCard>
                <ScoreLabel>Очки за цену</ScoreLabel>
                <ScoreValue>{breakdown.priceScore} очков</ScoreValue>
                <ScoreHint>Error: {errorPercent}</ScoreHint>
              </ScoreCard>

              <ScoreCard>
                <ScoreLabel>Очки за модель</ScoreLabel>
                <ScoreValue>{breakdown.modelScore} очков</ScoreValue>
              </ScoreCard>

              <ScoreCard>
                <ScoreLabel>Правильный ответ</ScoreLabel>
                <ScoreText>
                  Фактическая цена: {formatPrice(correctPrice)}
                  <br />
                  {correctYear} {correctTitle}
                </ScoreText>
              </ScoreCard>
            </ScoreGrid>
          </ResultSection>
        )}

        <Divider />

        <TotalRow>
          <TotalLabel>Total score</TotalLabel>
          <TotalScore>{formattedScore}</TotalScore>
        </TotalRow>
      </GameCard>
    </Page>
  );
}

/* ===================== styled-components ===================== */

const Page = styled.div`
  min-height: 100vh;
  padding: 40px 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: radial-gradient(circle at top, #1f2933 0, #020617 55%, #000 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: #f9fafb;
`;

const GameCard = styled.div`
  width: 100%;
  max-width: 960px;
  background: rgba(15, 23, 42, 0.96);
  border-radius: 24px;
  padding: 28px 28px 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(16px);
`;

const Title = styled.h1`
  margin: 0 0 20px;
  font-size: 28px;
  letter-spacing: 0.03em;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;

  &::after {
    content: "🚙";
    font-size: 24px;
  }
`;

const RoundIndicator = styled.div`
  margin-bottom: 18px;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a5b4fc;
`;

const CarBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 820px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const CarInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;

  ul,
  li {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    list-style: none;
  }
`;

const CarTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 14px;
  color: #9ca3af;
`;

const InputsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
`;

const ActionsRow = styled.div`
  margin-top: 60px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const ButtonBase = styled.button`
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 80ms ease,
    background 120ms ease;

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
    box-shadow: none;
  }

  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.99);
    box-shadow: none;
  }
`;

const PrimaryButton = styled(ButtonBase)`
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #f9fafb;
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #4ade80, #16a34a);
    box-shadow: 0 12px 38px rgba(34, 197, 94, 0.55);
    transform: translateY(-1px);
  }
`;

const SecondaryButton = styled(ButtonBase)`
  background: rgba(15, 23, 42, 0.7);
  color: #e5e7eb;
  border: 1px solid rgba(75, 85, 99, 0.8);

  &:hover:not(:disabled) {
    background: rgba(15, 23, 42, 0.95);
  }
`;

const ResultSection = styled.section`
  margin-top: 26px;
`;

const RoundScore = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;

  span {
    font-size: 20px;
    font-weight: 700;
    color: #f97316;
  }
`;

const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const ScoreCard = styled.div`
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(55, 65, 81, 0.9);
  padding: 12px 14px;
`;

const ScoreLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #9ca3af;
  margin-bottom: 4px;
`;

const ScoreValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #fbbf24;
`;

const ScoreHint = styled.div`
  font-size: 13px;
  color: #9ca3af;
  margin-top: 2px;
`;

const ScoreText = styled.div`
  font-size: 14px;
  color: #e5e7eb;
  line-height: 1.4;
`;

const Divider = styled.hr`
  margin: 22px 0 14px;
  border: none;
  border-top: 1px dashed rgba(55, 65, 81, 0.7);
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`;

const TotalLabel = styled.div`
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #9ca3af;
`;

const TotalScore = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: #38bdf8;
`;

const LoadingBlock = styled.div`
  padding: 40px 0 10px;
  font-size: 16px;
  color: #e5e7eb;
  opacity: 0.9;
`;

const GalleryWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BigImage = styled.img`
  width: 100%;
  min-height: 600px;
  object-fit: contain;
  border-radius: 14px;
  border: 1px solid rgba(55, 65, 81, 0.7);
  transition: opacity 200ms ease;
`;

const ThumbStrip = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #41506b;
    border-radius: 6px;
  }
`;

const Thumb = styled.div<{ $active: boolean }>`
  flex: 0 0 auto;
  border-radius: 8px;
  border: 2px solid
    ${({ $active }) => ($active ? "#38bdf8" : "rgba(55, 65, 81, 0.8)")};
  cursor: pointer;
  overflow: hidden;
  transition: border-color 150ms ease;

  &:hover {
    border-color: #38bdf8;
  }
`;

const ThumbImg = styled.img`
  width: 80px;
  height: 60px;
  object-fit: cover;
`;

const NavButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(15, 23, 42, 0.75);
  color: #f9fafb;
  border: 1px solid rgba(55, 65, 81, 0.8);
  border-radius: 50%;
  width: 32px;
  height: 50px;
  font-size: 20px;
  line-height: 0;
  cursor: pointer;
  transition: background 120ms ease;

  &:hover {
    background: rgba(15, 23, 42, 0.95);
  }
`;

const NavButtonLeft = styled(NavButton)`
  left: 8px;
`;

const NavButtonRight = styled(NavButton)`
  right: 8px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Icon = styled.div`
  position: absolute;
  left: 12px;
  font-size: 16px;
  opacity: 0.7;
  pointer-events: none;
`;

const FancyInput = styled.input`
  width: 100%;
  background: rgba(2, 6, 23, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(55, 65, 81, 0.4);
  padding: 12px 14px 12px 40px;
  font-size: 15px;
  color: #e5e7eb;
  outline: none;
  transition: 120ms ease;
  backdrop-filter: blur(6px);

  &::placeholder {
    color: #737b87;
  }

  &:hover {
    border-color: rgba(148, 163, 184, 0.6);
  }

  &:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
    background: rgba(2, 6, 23, 0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const SuggestBox = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: rgba(2, 6, 23, 0.98);
  border: 1px solid rgba(55, 65, 81, 0.9);
  border-radius: 12px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.45);
`;

const SuggestItem = styled.div`
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  color: #e5e7eb;
  border-bottom: 1px solid rgba(55, 65, 81, 0.6);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(56, 189, 248, 0.15);
  }
`;
