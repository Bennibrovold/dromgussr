import { useEffect, useState } from "react";
import styled from "styled-components";

const BASE_URL = "http://localhost:3000";
const TOTAL_ROUNDS = 5;

type Car = {
  image: { src: string };
  title?: string;
  year?: number;
  price?: number;
  initialPriceRub?: number;
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


export default function Game() {
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
          <Title>Game finished</Title>
          <RoundIndicator>All {TOTAL_ROUNDS} rounds completed</RoundIndicator>
          <Hint>Thanks for playing - restart to chase a higher score.</Hint>
          <TotalRow>
            <TotalLabel>Final score</TotalLabel>
            <TotalScore>{formattedScore}</TotalScore>
          </TotalRow>
          <ActionsRow>
            <PrimaryButton onClick={restartGame}>Play again</PrimaryButton>
          </ActionsRow>
        </GameCard>
      </Page>
    );
  }

  if (!car || loading) {
    return (
      <Page>
        <GameCard>
          <Title>Guess the Price &amp; Model</Title>
          <LoadingBlock>Loading car…</LoadingBlock>
        </GameCard>
      </Page>
    );
  }

  return (
    <Page>
      <GameCard>
        <Title>Guess the Price &amp; Model</Title>
        <RoundIndicator>Round {roundLabel} / {TOTAL_ROUNDS}</RoundIndicator>

        <CarBlock>
          <CarImageWrapper>
            <CarImage src={car.image.src} alt={car.title} />
          </CarImageWrapper>

          <CarInfo>
            <CarTitle>Год {car.year ?? "-"}</CarTitle>
            <Hint>Type your guess and see how close you are 👇</Hint>

            <InputsGrid>
              <Field>
                <Label>Guess price, ₽</Label>
                <Input
                  type="number"
                  value={priceGuess}
                  onChange={(e) =>
                    setPriceGuess(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="Например, 750000"
                />
              </Field>

              <Field>
                <Label>Guess model</Label>
                <Input
                  type="text"
                  value={modelGuess}
                  onChange={(e) => setModelGuess(e.target.value)}
                  placeholder="Impreza, Crown…"
                />
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
                {submitting ? "Checking…" : "Submit guess"}
              </PrimaryButton>

              <SecondaryButton
                onClick={handleNextRound}
                disabled={submitting || loading}
              >
                {round === TOTAL_ROUNDS ? "Finish game" : "Skip / Next car"}
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
                <ScoreLabel>Price score</ScoreLabel>
                <ScoreValue>{breakdown.priceScore} pts</ScoreValue>
                <ScoreHint>Error: {errorPercent}</ScoreHint>
              </ScoreCard>

              <ScoreCard>
                <ScoreLabel>Model score</ScoreLabel>
                <ScoreValue>{breakdown.modelScore} pts</ScoreValue>
              </ScoreCard>

              <ScoreCard>
                <ScoreLabel>Correct answer</ScoreLabel>
                <ScoreText>
                  Price: {formatPrice(correctPrice)}
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
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.3fr);
  gap: 24px;

  @media (max-width: 820px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const CarImageWrapper = styled.div`
  border-radius: 18px;
  overflow: hidden;
  background: radial-gradient(circle at top, #111827, #020617);
  border: 1px solid rgba(55, 65, 81, 0.8);
  position: relative;
  min-height: 240px;
`;

const CarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.02);
  transition: transform 200ms ease-out;

  ${CarImageWrapper}:hover & {
    transform: scale(1.06);
  }
`;

const CarInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
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

const Input = styled.input`
  background: #020617;
  border-radius: 10px;
  border: 1px solid rgba(55, 65, 81, 0.9);
  padding: 10px 12px;
  font-size: 14px;
  color: #e5e7eb;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease,
    background 120ms ease;

  &::placeholder {
    color: #6b7280;
  }

  &:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4);
    background: #020617;
  }
`;

const ActionsRow = styled.div`
  margin-top: 6px;
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
